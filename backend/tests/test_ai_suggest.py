"""
test_ai_suggest.py — Unit tests for POST /api/content/ai-suggest

Test strategy:
  - OpenRouter is NEVER called in tests — all httpx calls are mocked.
  - Redis is mocked to control rate-limit state.
  - Auth dependency is overridden to inject a dummy user.

Coverage:
  1. valid_json_response_parsed_correctly
  2. malformed_json_triggers_retry_then_502
  3. rate_limit_enforcement (10 req/hr cap)
  4. timeout_handling
  5. generate_disabled_with_no_platforms (request-level validation)
  6. openrouter_auth_failure_maps_to_502
  7. openrouter_provider_rate_limit_maps_to_503
"""

import json
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ── Minimal app import path ───────────────────────────────────────────────────
# We test via the FastAPI TestClient to exercise the full routing + DI stack.
import sys
import os

# Ensure backend app is importable from tests/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.presentation.dependencies.auth import get_current_user
from database.postgresql.models import User, UserRole


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _dummy_user() -> User:
    u = MagicMock(spec=User)
    u.id = uuid.uuid4()
    u.role = UserRole.CREATOR if hasattr(UserRole, "CREATOR") else MagicMock(value="creator")
    u.is_active = True
    return u


@pytest.fixture
def client():
    """TestClient with auth dependency overridden to a dummy user and dummy API key set."""
    dummy = _dummy_user()
    app.dependency_overrides[get_current_user] = lambda: dummy
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-v1-mock-test-key-for-unit-testing"}):
        yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def mock_redis_ok():
    """Redis mock that always allows requests (count < limit)."""
    redis_mock = MagicMock()
    redis_mock.incr.return_value = 1     # first call in window
    redis_mock.expire.return_value = True
    redis_mock.ttl.return_value = 3600
    with patch("app.presentation.routes.ai_suggest.get_redis_client", return_value=redis_mock):
        yield redis_mock


@pytest.fixture
def mock_redis_exceeded():
    """Redis mock that reports rate limit exceeded."""
    redis_mock = MagicMock()
    redis_mock.incr.return_value = 11    # over the 10-request limit
    redis_mock.ttl.return_value = 1800   # 30 minutes remaining
    with patch("app.presentation.routes.ai_suggest.get_redis_client", return_value=redis_mock):
        yield redis_mock


def _openrouter_response(content: str) -> MagicMock:
    """Build a mock httpx.Response-like object."""
    resp = MagicMock()
    resp.status_code = 200
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {
        "choices": [{"message": {"content": content}}],
        "usage": {"prompt_tokens": 100, "completion_tokens": 80, "total_tokens": 180},
    }
    return resp


# ── Test cases ────────────────────────────────────────────────────────────────

class TestAISuggest:

    def test_valid_single_platform_response(self, client, mock_redis_ok):
        """Valid JSON from OpenRouter is parsed and returned correctly."""
        payload = json.dumps({
            "title": "Summer Sale Is On!",
            "body": "🔥 Up to 50% off. Limited time only.",
            "hashtags": ["summersale", "discount", "deals"],
        })

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.return_value = (
                _openrouter_response(payload)
            )
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "summer clothing sale", "platforms": ["instagram"]},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Summer Sale Is On!"
        assert data["body"] == "🔥 Up to 50% off. Limited time only."
        assert "summersale" in data["hashtags"]
        # API key must NEVER appear in the response
        resp_text = response.text
        assert "sk-or" not in resp_text
        assert "OPENROUTER" not in resp_text

    def test_valid_multi_platform_variants(self, client, mock_redis_ok):
        """Multi-platform request returns variants dict."""
        payload = json.dumps({
            "title": "Big News",
            "variants": {
                "instagram": "Instagram-optimised caption here. Great deals await!",
                "twitter": "Short tweet. Big deals!",
                "linkedin": "Professional LinkedIn post about our exciting summer sale.",
            },
            "hashtags": ["bigsale", "fashion"],
        })

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.return_value = (
                _openrouter_response(payload)
            )
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "summer sale", "platforms": ["instagram", "twitter", "linkedin"]},
            )

        assert response.status_code == 200
        data = response.json()
        assert "variants" in data
        assert "instagram" in data["variants"]

    def test_malformed_json_triggers_retry_then_502(self, client, mock_redis_ok):
        """If OpenRouter returns bad JSON twice, the endpoint returns 502."""
        bad_resp = _openrouter_response("This is NOT json at all!!!")

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.return_value = bad_resp
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "product launch", "platforms": ["instagram"]},
            )

        assert response.status_code == 502
        assert "invalid response" in response.json()["detail"].lower()

    def test_malformed_json_succeeds_on_retry(self, client, mock_redis_ok):
        """First call returns bad JSON; second call returns valid — should succeed."""
        good_payload = json.dumps({
            "title": "Retry Success",
            "body": "It worked on the second try!",
            "hashtags": ["retry"],
        })
        bad_resp = _openrouter_response("Not JSON")
        good_resp = _openrouter_response(good_payload)

        call_count = 0

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return bad_resp if call_count == 1 else good_resp

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.side_effect = side_effect
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "retry topic", "platforms": ["linkedin"]},
            )

        assert response.status_code == 200
        assert response.json()["title"] == "Retry Success"

    def test_rate_limit_enforcement(self, client, mock_redis_exceeded):
        """When Redis counter exceeds limit, endpoint returns 429."""
        response = client.post(
            "/api/content/ai-suggest",
            json={"topic": "anything", "platforms": ["instagram"]},
        )
        assert response.status_code == 429
        detail = response.json()["detail"]
        assert "limit" in detail.lower()
        assert "minute" in detail.lower() or "hour" in detail.lower()

    def test_timeout_returns_504(self, client, mock_redis_ok):
        """OpenRouter timeout maps to 504 Gateway Timeout."""
        import httpx as _httpx

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.side_effect = (
                _httpx.TimeoutException("timed out")
            )
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "slow ai test", "platforms": ["instagram"]},
            )

        assert response.status_code == 504
        assert "timed out" in response.json()["detail"].lower() or "timeout" in response.json()["detail"].lower()

    def test_openrouter_auth_failure_returns_502(self, client, mock_redis_ok):
        """OpenRouter 401 maps to 502 (server-side key problem, not user's fault)."""
        import httpx as _httpx

        err_resp = MagicMock()
        err_resp.status_code = 401
        http_err = _httpx.HTTPStatusError(
            "401 Unauthorized", request=MagicMock(), response=err_resp
        )

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.side_effect = http_err
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "auth test", "platforms": ["instagram"]},
            )

        assert response.status_code == 502
        assert "authentication" in response.json()["detail"].lower() or "key" in response.json()["detail"].lower()

    def test_openrouter_provider_rate_limit_returns_503(self, client, mock_redis_ok):
        """OpenRouter 429 (their rate limit) maps to 503 — user should retry later."""
        import httpx as _httpx

        err_resp = MagicMock()
        err_resp.status_code = 429
        http_err = _httpx.HTTPStatusError(
            "429 Too Many Requests", request=MagicMock(), response=err_resp
        )

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.side_effect = http_err
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "rate limit test", "platforms": ["twitter"]},
            )

        assert response.status_code == 503
        detail = response.json()["detail"].lower()
        assert "unavailable" in detail or "demand" in detail

    def test_missing_topic_returns_422(self, client, mock_redis_ok):
        """Empty/missing topic is rejected at the request validation layer."""
        response = client.post(
            "/api/content/ai-suggest",
            json={"platforms": ["instagram"]},
        )
        assert response.status_code == 422

    def test_empty_platforms_returns_422(self, client, mock_redis_ok):
        """Submitting zero platforms is rejected at the request validation layer."""
        response = client.post(
            "/api/content/ai-suggest",
            json={"topic": "my great topic", "platforms": []},
        )
        assert response.status_code == 422

    def test_markdown_fenced_json_is_parsed(self, client, mock_redis_ok):
        """Some models wrap JSON in ```json fences — service must strip them."""
        fenced = "```json\n" + json.dumps({
            "title": "Fenced Title",
            "body": "Fenced body text.",
            "hashtags": ["test"],
        }) + "\n```"

        with patch("app.services.ai_suggestion_service.httpx.Client") as mock_http:
            mock_http.return_value.__enter__.return_value.post.return_value = (
                _openrouter_response(fenced)
            )
            response = client.post(
                "/api/content/ai-suggest",
                json={"topic": "fenced json test", "platforms": ["facebook"]},
            )

        assert response.status_code == 200
        assert response.json()["title"] == "Fenced Title"
