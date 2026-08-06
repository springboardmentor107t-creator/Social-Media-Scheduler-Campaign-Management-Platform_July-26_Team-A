import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add root workspace directories to sys.path to support imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from database.postgresql.models import (
    Base,
    User,
    UserRole,
    Content,
    ContentStatus,
    ContentType,
    SocialAccount,
    ScheduledPost,
)
from database.postgresql.connection import get_db
from app.core.security import create_access_token, get_password_hash
from app.core.config import settings

# Setup testing in-memory SQLite database using StaticPool to persist connection
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
    
    # Create test users: regular user with hashed password
    password_hash = get_password_hash("password123")
    test_user = User(
        id=uuid.UUID("33333333-3333-3333-3333-33333333333c"),
        email="user@test.com",
        username="user",
        password_hash=password_hash,
        role=UserRole.USER,
        is_active=True,
        full_name="Account User",
        timezone="UTC"
    )
    
    db.add(test_user)
    db.commit()
    db.close()
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def get_auth_headers(email: str, role: str, user_id: uuid.UUID) -> dict:
    token_data = {"sub": str(user_id), "email": email, "role": role}
    token = create_access_token(token_data)
    return {"Authorization": f"Bearer {token}"}


client = TestClient(app)


def test_change_password_success():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    
    # Change password to a strong new password
    response = client.post(
        "/users/me/change-password",
        json={
            "current_password": "password123",
            "new_password": "newpassword1"
        },
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password successfully updated"

    # Verify that new password can be used to log in
    response = client.post(
        "/api/auth/login",
        json={
            "email": "user@test.com",
            "password": "newpassword1"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_content_and_social_schema_supports_extended_fields():
    user = User(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        email="schema@test.com",
        username="schema-user",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True,
        full_name="Schema User",
        timezone="UTC",
    )

    content = Content(
        owner_id=user.id,
        title="Campaign draft",
        body="This is the draft body",
        media_urls=["https://example.com/1.png"],
        content_type=ContentType.IMAGE,
        status=ContentStatus.DRAFT,
    )
    assert content.body == "This is the draft body"
    assert content.media_urls == ["https://example.com/1.png"]
    assert content.content_type == ContentType.IMAGE
    assert content.status == ContentStatus.DRAFT

    social_account = SocialAccount(
        user_id=user.id,
        provider="instagram",
        provider_account_id="acct-123",
        account_name="My Instagram",
        last_sync_time=datetime.utcnow(),
    )
    assert social_account.last_sync_time is not None

    scheduled_post = ScheduledPost(
        content_id=content.id,
        social_account_id=social_account.id,
        scheduled_time=datetime.utcnow() + timedelta(days=1),
        is_recurring=True,
        recurrence_rule="weekly",
    )
    assert scheduled_post.is_recurring is True
    assert scheduled_post.recurrence_rule == "weekly"


def test_change_password_unhappy_paths():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))

    # Wrong current password
    response = client.post(
        "/users/me/change-password",
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword1"
        },
        headers=headers
    )
    assert response.status_code == 400
    assert "Incorrect current password" in response.json()["detail"]

    # New password too short
    response = client.post(
        "/users/me/change-password",
        json={
            "current_password": "password123",
            "new_password": "short"
        },
        headers=headers
    )
    assert response.status_code == 422
    assert "at least 8 characters" in response.text

    # New password lacks digit
    response = client.post(
        "/users/me/change-password",
        json={
            "current_password": "password123",
            "new_password": "nonumbers"
        },
        headers=headers
    )
    assert response.status_code == 422
    assert "Password must contain at least one number" in response.text


def test_patch_account_settings():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))

    response = client.patch(
        "/users/me/account",
        json={
            "timezone": "Europe/London",
            "notification_preferences": {
                "email_alerts": True,
                "sms_reminders": False
            }
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["timezone"] == "Europe/London"
    assert data["notification_preferences"] == {
        "email_alerts": True,
        "sms_reminders": False
    }


def test_deactivate_and_token_rejection_flow():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))

    # Try deactivating with wrong password
    response = client.post("/users/me/deactivate", json={"password": "wrongpassword"}, headers=headers)
    assert response.status_code == 400
    assert "Incorrect password confirmation" in response.json()["detail"]

    # Deactivate successfully
    response = client.post("/users/me/deactivate", json={"password": "password123"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Account successfully deactivated"

    # Confirm database is_active is set to False
    db = TestingSessionLocal()
    db_user = db.query(User).filter(User.id == uuid.UUID("33333333-3333-3333-3333-33333333333c")).first()
    assert db_user.is_active is False
    db.close()

    # Subsequent requests with the existing JWT must fail with 403
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is deactivated"

    # Subsequent login attempts must fail with 403
    response = client.post(
        "/api/auth/login",
        json={
            "email": "user@test.com",
            "password": "password123"
        }
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is deactivated"
