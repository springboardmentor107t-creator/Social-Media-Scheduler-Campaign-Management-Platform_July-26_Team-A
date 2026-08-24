"""
test_analytics.py — Tests for the Analytics & Reports endpoints.

Routes tested:
  GET /api/analytics/engagement   — engagement metrics
  GET /api/analytics/audience     — audience growth
  GET /api/analytics/roi          — ROI summary
  GET /api/analytics/comparison   — campaign comparison
  GET /api/reports/campaigns      — campaign reports overview
  GET /api/reports/campaigns/{id} — single campaign report
"""
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from database.postgresql.models import Base, User, UserRole
from database.postgresql.connection import get_db
from app.core.security import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
client = TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()

    user = User(
        id=uuid.UUID("33333333-3333-3333-3333-33333333333c"),
        email="user@test.com",
        username="user",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.close()
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def _headers() -> dict:
    token = create_access_token({
        "sub": "33333333-3333-3333-3333-33333333333c",
        "email": "user@test.com",
        "role": "user",
    })
    return {"Authorization": f"Bearer {token}"}


# ── Engagement Analytics ──────────────────────────────────────────────────────
def test_engagement_analytics_default():
    """Returns 200 with correct top-level shape for default 30d timeframe."""
    res = client.get("/api/analytics/engagement", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "timeline" in data
    assert "platform_breakdown" in data
    assert data["timeframe"] == "30d"


def test_engagement_analytics_7d_timeframe():
    """7d timeframe returns 7 timeline entries."""
    res = client.get("/api/analytics/engagement?timeframe=7d", headers=_headers())
    assert res.status_code == 200
    assert len(res.json()["timeline"]) == 7


def test_engagement_analytics_requires_auth():
    """Unauthenticated request returns 401."""
    res = client.get("/api/analytics/engagement")
    assert res.status_code == 401


# ── Audience Growth ───────────────────────────────────────────────────────────
def test_audience_growth_returns_correct_shape():
    """Returns 200 with summary, demographics, and growth_trend."""
    res = client.get("/api/analytics/audience", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "demographics" in data
    assert "growth_trend" in data
    assert "total_followers" in data["summary"]


def test_audience_growth_requires_auth():
    res = client.get("/api/analytics/audience")
    assert res.status_code == 401


# ── ROI Analytics ─────────────────────────────────────────────────────────────
def test_roi_analytics_success():
    """Returns 200 with roi_summary and monthly_roi_trend."""
    res = client.get("/api/analytics/roi", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "roi_summary" in data
    assert "monthly_roi_trend" in data
    assert "overall_roi" in data["roi_summary"]


# ── Campaign Comparison ───────────────────────────────────────────────────────
def test_campaign_comparison_success():
    """Returns 200 with compared_campaigns and winning_metrics."""
    res = client.get("/api/analytics/comparison", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "compared_campaigns" in data
    assert "winning_metrics" in data
    assert isinstance(data["compared_campaigns"], list)


# ── Campaign Reports ──────────────────────────────────────────────────────────
def test_campaign_reports_overview():
    """Returns 200 with overview and campaign_reports list."""
    res = client.get("/api/reports/campaigns", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "overview" in data
    assert "campaign_reports" in data
    assert "total_campaigns" in data["overview"]


def test_campaign_reports_requires_auth():
    res = client.get("/api/reports/campaigns")
    assert res.status_code == 401


def test_single_campaign_report_success():
    """Returns 200 with summary and kpi_performance for any campaign ID."""
    fake_id = str(uuid.uuid4())
    res = client.get(f"/api/reports/campaigns/{fake_id}", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "kpi_performance" in data
    assert "campaign_id" in data
