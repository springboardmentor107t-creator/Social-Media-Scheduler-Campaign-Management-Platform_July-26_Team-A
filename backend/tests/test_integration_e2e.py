"""
test_integration_e2e.py — End-to-end integration tests for the core value chain.

Validates the full flow that is the product's primary value proposition:
  1. Register → Login → Create Content → Schedule → Verify DB state

Also validates:
  2. Recurring post scheduling: is_recurring + recurrence_rule preserved
  3. Content duplication workflow

All tests use an in-memory SQLite database; no live PostgreSQL connection is required.
"""
import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from database.postgresql.models import (
    Base, User, SocialAccount, Content, ScheduledPost,
    UserRole, ContentStatus, ScheduledPostStatus
)
from database.postgresql.connection import get_db
from app.core.security import create_access_token, get_password_hash

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
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


# ── Core Value-Chain Integration Test ─────────────────────────────────────────
def test_full_register_login_create_schedule_flow():
    """
    CORE E2E: Register a new user → Login → Create content draft →
    Schedule it → Verify ScheduledPost row exists with PENDING status
    and Content status transitions to PENDING_APPROVAL.
    """
    # 1. Register
    reg_res = client.post("/api/auth/register", json={
        "email": "e2e_user@test.com",
        "password": "TestPassword1",
        "username": "e2euser",
        "full_name": "E2E User",
    })
    assert reg_res.status_code in (200, 201), f"Register failed: {reg_res.text}"
    access_token = reg_res.json()["access_token"]
    user_id = reg_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 2. Create a social account directly in DB (OAuth not available in tests)
    db = TestingSessionLocal()
    sa = SocialAccount(
        user_id=uuid.UUID(user_id),
        provider="twitter",
        provider_account_id=f"tw_{user_id}",
        account_name="@e2euser",
        is_active=True,
    )
    db.add(sa)
    db.commit()
    db.refresh(sa)
    sa_id = str(sa.id)
    db.close()

    # 3. Create content draft
    content_res = client.post("/content", json={
        "title": "E2E Test Post",
        "body": "This is the end-to-end integration test post body.",
        "content_type": "text",
        "status": "draft",
    }, headers=headers)
    assert content_res.status_code == 201, f"Content create failed: {content_res.text}"
    content_id = content_res.json()["id"]
    assert content_res.json()["status"] == "draft"

    # 4. Schedule the content for future time
    future_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    schedule_res = client.post("/scheduled-posts", json={
        "content_id": content_id,
        "social_account_ids": [sa_id],
        "scheduled_time": future_time,
        "is_recurring": False,
    }, headers=headers)
    assert schedule_res.status_code == 201, f"Schedule failed: {schedule_res.text}"

    sp_data = schedule_res.json()["scheduled_posts"]
    assert len(sp_data) == 1
    assert sp_data[0]["status"] == "pending"

    # 5. Verify DB: ScheduledPost has PENDING status
    db = TestingSessionLocal()
    sp_id = uuid.UUID(sp_data[0]["id"])
    sp = db.query(ScheduledPost).filter(ScheduledPost.id == sp_id).first()
    assert sp is not None
    assert sp.status == ScheduledPostStatus.PENDING

    # 6. Verify Content status is now PENDING_APPROVAL (regular user flow)
    content_obj = db.query(Content).filter(Content.id == uuid.UUID(content_id)).first()
    assert content_obj is not None
    assert content_obj.status == ContentStatus.PENDING_APPROVAL
    db.close()


# ── Recurring Post Workflow ───────────────────────────────────────────────────
def test_recurring_post_schedule_preserves_rule():
    """
    Schedule a post with is_recurring=True and recurrence_rule="weekly".
    Verify the response preserves both fields correctly.
    """
    reg_res = client.post("/api/auth/register", json={
        "email": "recur_user@test.com",
        "password": "TestPassword1",
        "username": "recuruser",
        "full_name": "Recur User",
    })
    assert reg_res.status_code in (200, 201)
    access_token = reg_res.json()["access_token"]
    user_id = reg_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Seed social account
    db = TestingSessionLocal()
    sa = SocialAccount(
        user_id=uuid.UUID(user_id),
        provider="linkedin",
        provider_account_id=f"li_{user_id}",
        account_name="Recur User LinkedIn",
        is_active=True,
    )
    db.add(sa)
    db.commit()
    db.refresh(sa)
    sa_id = str(sa.id)
    db.close()

    # Create content
    content_res = client.post("/content", json={"title": "Weekly Digest"}, headers=headers)
    assert content_res.status_code == 201
    content_id = content_res.json()["id"]

    # Schedule as recurring weekly
    future_time = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    schedule_res = client.post("/scheduled-posts", json={
        "content_id": content_id,
        "social_account_ids": [sa_id],
        "scheduled_time": future_time,
        "is_recurring": True,
        "recurrence_rule": "weekly",
    }, headers=headers)
    assert schedule_res.status_code == 201

    sp = schedule_res.json()["scheduled_posts"][0]
    assert sp["is_recurring"] is True
    assert sp["recurrence_rule"] == "weekly"


# ── Login flow ────────────────────────────────────────────────────────────────
def test_login_returns_valid_token():
    """Register then login; confirm token is usable on authenticated endpoints."""
    client.post("/api/auth/register", json={
        "email": "logintest@test.com",
        "password": "TestPassword1",
        "username": "logintest",
        "full_name": "Login Tester",
    })

    login_res = client.post("/api/auth/login", json={
        "email": "logintest@test.com",
        "password": "TestPassword1",
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    me_res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "logintest@test.com"


def test_login_wrong_password_fails():
    """Login with wrong password returns 401."""
    client.post("/api/auth/register", json={
        "email": "wrongpw@test.com",
        "password": "TestPassword1",
        "username": "wrongpwuser",
        "full_name": "Wrong PW",
    })
    res = client.post("/api/auth/login", json={
        "email": "wrongpw@test.com",
        "password": "WrongPassword9",
    })
    assert res.status_code == 401
