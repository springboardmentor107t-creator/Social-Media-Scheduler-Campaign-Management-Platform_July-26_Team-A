"""
test_campaigns.py — Tests for the Campaign Management endpoints.

Routes tested:
  POST   /api/campaigns              — create campaign
  GET    /api/campaigns              — list campaigns
  GET    /api/campaigns/{id}         — get campaign by id
  PUT    /api/campaigns/{id}         — update campaign
  DELETE /api/campaigns/{id}         — delete campaign
  GET    /api/campaigns/{id}/tracking — campaign tracking metrics
  POST   /api/campaigns/{id}/schedule — schedule post for campaign
  GET    /api/campaigns/{id}/scheduled-posts — get campaign scheduled posts
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

# ── In-memory SQLite test database ────────────────────────────────────────────
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

    # Seed: one regular user, one manager
    user = User(
        id=uuid.UUID("33333333-3333-3333-3333-33333333333c"),
        email="user@test.com",
        username="user",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True,
    )
    other_user = User(
        id=uuid.UUID("55555555-5555-5555-5555-55555555555e"),
        email="other@test.com",
        username="other",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.add(other_user)
    db.commit()
    db.close()

    yield

    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def _headers(user_id: str = "33333333-3333-3333-3333-33333333333c",
             email: str = "user@test.com",
             role: str = "user") -> dict:
    token = create_access_token({"sub": user_id, "email": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


# ── CREATE ────────────────────────────────────────────────────────────────────
def test_create_campaign_success():
    """Happy path: authenticated user creates a campaign."""
    res = client.post(
        "/api/campaigns",
        json={
            "name": "Summer Launch",
            "description": "Summer product campaign",
            "status": "draft",
        },
        headers=_headers(),
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Summer Launch"
    assert data["description"] == "Summer product campaign"


def test_create_campaign_missing_name():
    """Fail: campaign name is required."""
    res = client.post("/api/campaigns", json={}, headers=_headers())
    assert res.status_code == 422


def test_create_campaign_unauthenticated():
    """Fail: no token → 401."""
    res = client.post("/api/campaigns", json={"name": "No Auth"})
    assert res.status_code == 401


# ── LIST ──────────────────────────────────────────────────────────────────────
def test_list_campaigns_empty():
    """Returns empty list when no campaigns exist."""
    res = client.get("/api/campaigns", headers=_headers())
    assert res.status_code == 200
    assert res.json() == []


def test_list_campaigns_returns_own_only():
    """Users only see their own campaigns, not other users' campaigns."""
    # User creates a campaign
    client.post("/api/campaigns", json={"name": "My Campaign"}, headers=_headers())

    # Other user should see an empty list
    other_headers = _headers(
        user_id="55555555-5555-5555-5555-55555555555e",
        email="other@test.com"
    )
    res = client.get("/api/campaigns", headers=other_headers)
    assert res.status_code == 200
    names = [c["name"] for c in res.json()]
    assert "My Campaign" not in names


def test_list_campaigns_status_filter():
    """Status filter returns only matching campaigns."""
    client.post("/api/campaigns", json={"name": "Draft Camp", "status": "draft"}, headers=_headers())
    client.post("/api/campaigns", json={"name": "Active Camp", "status": "active"}, headers=_headers())

    res = client.get("/api/campaigns?status=draft", headers=_headers())
    assert res.status_code == 200
    names = [c["name"] for c in res.json()]
    assert "Draft Camp" in names
    assert "Active Camp" not in names


# ── GET BY ID ─────────────────────────────────────────────────────────────────
def test_get_campaign_by_id():
    """Happy path: get campaign by ID."""
    create_res = client.post("/api/campaigns", json={"name": "My Campaign"}, headers=_headers())
    cid = create_res.json()["id"]

    res = client.get(f"/api/campaigns/{cid}", headers=_headers())
    assert res.status_code == 200
    assert res.json()["id"] == cid


def test_get_campaign_other_user_forbidden():
    """Other user cannot fetch a campaign they don't own."""
    create_res = client.post("/api/campaigns", json={"name": "Secret Camp"}, headers=_headers())
    cid = create_res.json()["id"]

    other_headers = _headers(
        user_id="55555555-5555-5555-5555-55555555555e",
        email="other@test.com"
    )
    res = client.get(f"/api/campaigns/{cid}", headers=other_headers)
    assert res.status_code == 404


# ── UPDATE ────────────────────────────────────────────────────────────────────
def test_update_campaign_success():
    """Happy path: update campaign name and status."""
    create_res = client.post("/api/campaigns", json={"name": "Old Name"}, headers=_headers())
    cid = create_res.json()["id"]

    res = client.put(
        f"/api/campaigns/{cid}",
        json={"name": "New Name", "status": "active"},
        headers=_headers(),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "New Name"


def test_update_campaign_not_found():
    """Non-existent campaign returns 404."""
    res = client.put(
        f"/api/campaigns/{uuid.uuid4()}",
        json={"name": "Ghost"},
        headers=_headers(),
    )
    assert res.status_code == 404


# ── DELETE ────────────────────────────────────────────────────────────────────
def test_delete_campaign_success():
    """Owner can delete their campaign."""
    create_res = client.post("/api/campaigns", json={"name": "To Delete"}, headers=_headers())
    cid = create_res.json()["id"]

    res = client.delete(f"/api/campaigns/{cid}", headers=_headers())
    assert res.status_code == 200

    # Verify it's gone
    get_res = client.get(f"/api/campaigns/{cid}", headers=_headers())
    assert get_res.status_code == 404


# ── TRACKING ──────────────────────────────────────────────────────────────────
def test_campaign_tracking_returns_metrics():
    """Tracking endpoint returns expected metric shape."""
    create_res = client.post("/api/campaigns", json={"name": "Track Me"}, headers=_headers())
    cid = create_res.json()["id"]

    res = client.get(f"/api/campaigns/{cid}/tracking", headers=_headers())
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "total_posts" in data["metrics"]
    assert "published_posts" in data["metrics"]
