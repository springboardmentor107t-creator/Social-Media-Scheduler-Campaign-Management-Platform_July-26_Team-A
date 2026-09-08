"""
test_post_notifications.py — Tests for Creator → Manager/Admin notifications.

Verifies that:
  1. When a 'user'-role creator calls POST /content, notify_managers_and_admins is triggered.
  2. When a 'manager'-role user calls POST /content, no notification is triggered.
  3. notify_managers_and_admins() sends individual notifications to each manager/admin.
"""

import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
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

# ── In-memory SQLite setup ────────────────────────────────────────────────────
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
client = TestClient(app)

CREATOR_ID  = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
MANAGER_ID  = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
ADMIN_ID    = "cccccccc-cccc-cccc-cccc-cccccccccccc"


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

    creator = User(
        id=uuid.UUID(CREATOR_ID), email="creator@test.com", username="creator",
        password_hash="dummy", role=UserRole.USER, is_active=True,
    )
    manager = User(
        id=uuid.UUID(MANAGER_ID), email="manager@test.com", username="manager",
        password_hash="dummy", role=UserRole.MANAGER, is_active=True,
    )
    admin = User(
        id=uuid.UUID(ADMIN_ID), email="admin@test.com", username="admin",
        password_hash="dummy", role=UserRole.ADMIN, is_active=True,
    )
    db.add_all([creator, manager, admin])
    db.commit()
    db.close()

    yield

    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def _creator_headers() -> dict:
    token = create_access_token({"sub": CREATOR_ID, "email": "creator@test.com", "role": "user"})
    return {"Authorization": f"Bearer {token}"}


def _manager_headers() -> dict:
    token = create_access_token({"sub": MANAGER_ID, "email": "manager@test.com", "role": "manager"})
    return {"Authorization": f"Bearer {token}"}


def _make_mongo_db_mock() -> MagicMock:
    db = MagicMock()
    db.notifications.insert_one = AsyncMock(return_value=MagicMock(inserted_id="test-id"))
    return db


# ── Test 1: Creator creating a post triggers notification ─────────────────────
def test_post_created_notifies_managers_and_admins():
    """POST /content by a 'user' role creator should fire background_tasks.add_task."""
    mock_mongo = _make_mongo_db_mock()

    async def _mock_mongo_db():
        return mock_mongo

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_mongo_db):
        res = client.post(
            "/content",
            json={"title": "Test Post", "body": "Hello world", "status": "draft"},
            headers=_creator_headers(),
        )

    # The response must succeed — background task is fire-and-forget
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["title"] == "Test Post"


# ── Test 2: Manager creating a post does NOT trigger notification ─────────────
def test_post_created_by_manager_no_notification():
    """POST /content by a 'manager' should NOT fire a notification background task."""
    mock_mongo = _make_mongo_db_mock()

    async def _mock_mongo_db():
        return mock_mongo

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_mongo_db):
        res = client.post(
            "/content",
            json={"title": "Manager Post", "body": "No notification", "status": "draft"},
            headers=_manager_headers(),
        )

    assert res.status_code == 201, res.text
    # Manager role — notification helper is never called, so insert_one stays at 0
    mock_mongo.notifications.insert_one.assert_not_called()


# ── Test 3: notify_managers_and_admins sends per-recipient notifications ──────
@pytest.mark.asyncio
async def test_notify_managers_and_admins_sends_individual_notifications():
    """
    Calling notify_managers_and_admins() should create one MongoDB notification
    document per manager/admin, but NOT for the creator themselves.
    """
    from app.presentation.routes.notifications import notify_managers_and_admins

    mock_mongo = _make_mongo_db_mock()

    async def _mock_mongo_db():
        return mock_mongo

    db = TestingSessionLocal()

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_mongo_db):
        await notify_managers_and_admins(
            notif_type="post_created",
            message="📝 creator created a new post: \"Test\"",
            creator_id=CREATOR_ID,
            db=db,
        )

    db.close()

    # Should have inserted 2 documents: one for manager, one for admin
    assert mock_mongo.notifications.insert_one.call_count == 2


# ── Test 4: Creator creating when no managers exist → no error ────────────────
@pytest.mark.asyncio
async def test_notify_no_managers_no_error():
    """notify_managers_and_admins with no managers/admins should silently succeed."""
    from app.presentation.routes.notifications import notify_managers_and_admins

    # Create a fresh DB with only a creator user
    fresh_engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=fresh_engine)
    FreshSession = sessionmaker(bind=fresh_engine)
    db = FreshSession()
    creator_only = User(
        id=uuid.UUID(CREATOR_ID), email="solo@test.com", username="solo",
        password_hash="dummy", role=UserRole.USER, is_active=True,
    )
    db.add(creator_only)
    db.commit()

    mock_mongo = _make_mongo_db_mock()

    async def _mock_mongo_db():
        return mock_mongo

    with patch("app.presentation.routes.notifications.get_mongo_db", _mock_mongo_db):
        await notify_managers_and_admins(
            notif_type="post_created",
            message="📝 solo created a post",
            creator_id=CREATOR_ID,
            db=db,
        )

    db.close()
    # No managers/admins → no inserts
    mock_mongo.notifications.insert_one.assert_not_called()
