"""
test_notifications.py — Tests for the MongoDB-backed Notifications endpoints.

MongoDB is mocked using unittest.mock to avoid requiring a live MongoDB connection
during unit tests. The notification route helper functions are patched at the
motor client level so tests remain fast and isolated.

Routes tested:
  GET    /api/notifications              — list notifications
  PATCH  /api/notifications/{id}/read   — mark one read
  POST   /api/notifications/read-all    — mark all read
  POST   /api/notifications             — create notification
"""
import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
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

# ── In-memory SQLite (for PostgreSQL auth dependency) ─────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
client = TestClient(app)

USER_ID = "33333333-3333-3333-3333-33333333333c"


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
        id=uuid.UUID(USER_ID),
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
    token = create_access_token({"sub": USER_ID, "email": "user@test.com", "role": "user"})
    return {"Authorization": f"Bearer {token}"}


def _make_mongo_db_mock(docs: list = None) -> MagicMock:
    """Returns a MagicMock that mimics motor's async db object."""
    docs = docs or []
    db = MagicMock()

    # Simulate async cursor for find()
    async def _async_iter(self):
        for doc in docs:
            yield doc

    cursor = MagicMock()
    cursor.__aiter__ = _async_iter
    cursor.sort.return_value = cursor
    cursor.limit.return_value = cursor

    db.notifications.find = MagicMock(return_value=cursor)
    db.notifications.insert_one = AsyncMock(return_value=MagicMock(inserted_id="test-id"))
    db.notifications.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
    db.notifications.update_many = AsyncMock(return_value=MagicMock(modified_count=3))
    return db


# ── List Notifications ────────────────────────────────────────────────────────
def test_list_notifications_empty():
    """GET /api/notifications returns empty list when no notifications exist."""
    mock_db = _make_mongo_db_mock(docs=[])

    async def _mock_get_mongo_db():
        return mock_db

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_get_mongo_db):
        res = client.get("/api/notifications", headers=_headers())
    assert res.status_code == 200
    assert res.json() == []


def test_list_notifications_requires_auth():
    """GET /api/notifications without token returns 401."""
    res = client.get("/api/notifications")
    assert res.status_code == 401


# ── Create Notification ───────────────────────────────────────────────────────
def test_create_notification_success():
    """POST /api/notifications creates a notification and returns its data."""
    mock_db = _make_mongo_db_mock()

    async def _mock_get_mongo_db():
        return mock_db

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_get_mongo_db):
        res = client.post(
            "/api/notifications",
            json={"type": "campaign_alert", "message": "Test notification message"},
            headers=_headers(),
        )
    assert res.status_code == 201
    data = res.json()
    assert "id" in data
    assert data["type"] == "campaign_alert"
    assert data["message"] == "Test notification message"


def test_create_notification_requires_auth():
    """POST without token returns 401."""
    res = client.post(
        "/api/notifications",
        json={"type": "test", "message": "hello"},
    )
    assert res.status_code == 401


def test_create_notification_message_too_long():
    """POST with message > 500 chars returns 422."""
    res = client.post(
        "/api/notifications",
        json={"type": "test", "message": "x" * 501},
        headers=_headers(),
    )
    assert res.status_code == 422


# ── Mark as Read ──────────────────────────────────────────────────────────────
def test_mark_all_read_success():
    """POST /api/notifications/read-all returns success."""
    mock_db = _make_mongo_db_mock()

    async def _mock_get_mongo_db():
        return mock_db

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_get_mongo_db):
        res = client.post("/api/notifications/read-all", headers=_headers())
    assert res.status_code == 200
    assert "marked as read" in res.json()["message"]
