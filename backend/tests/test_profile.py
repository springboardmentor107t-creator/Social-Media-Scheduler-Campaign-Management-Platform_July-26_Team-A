import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

# Add root workspace directories to sys.path to support imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from database.postgresql.models import Base, User, UserRole
from database.postgresql.connection import get_db
from app.core.security import create_access_token
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
    
    # Create test users: regular user and another user to test conflict
    test_user = User(
        id=uuid.UUID("33333333-3333-3333-3333-33333333333c"),
        email="user@test.com",
        username="user",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True,
        full_name="Profile User",
        timezone="UTC"
    )
    test_user2 = User(
        id=uuid.UUID("55555555-5555-5555-5555-55555555555e"),
        email="other@test.com",
        username="other",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True,
        full_name="Other User",
        timezone="UTC"
    )
    
    db.add(test_user)
    db.add(test_user2)
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


def test_get_profile_me():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "user@test.com"
    assert data["full_name"] == "Profile User"
    assert data["timezone"] == "UTC"
    assert "password_hash" not in data
    assert "password" not in data


def test_patch_profile_me():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    
    # Successful partial update
    response = client.patch(
        "/users/me",
        json={
            "full_name": "Updated Name",
            "phone_number": "+1234567890",
            "timezone": "America/New_York",
            "bio": "Software developer",
            "avatar_url": "https://avatar.com/user.png"
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone_number"] == "+1234567890"
    assert data["timezone"] == "America/New_York"
    assert data["bio"] == "Software developer"
    assert data["avatar_url"] == "https://avatar.com/user.png"

    # Silent ignores: role and is_active changes must be ignored
    response = client.patch(
        "/users/me",
        json={
            "role": "admin",
            "is_active": False
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "user"
    assert data["is_active"] is True


def test_patch_profile_validation_errors():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))

    # Invalid timezone
    response = client.patch("/users/me", json={"timezone": "Invalid/Timezone"}, headers=headers)
    assert response.status_code == 422
    assert "Invalid IANA timezone string" in response.text

    # Too long bio
    response = client.patch("/users/me", json={"bio": "a" * 161}, headers=headers)
    assert response.status_code == 422
    assert "at most 160 characters" in response.text

    # Invalid phone format
    response = client.patch("/users/me", json={"phone_number": "123"}, headers=headers)
    assert response.status_code == 422
    assert "Invalid phone number format" in response.text


def test_email_change_flow():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))

    with patch("app.presentation.routes.users.send_verification_email") as mock_send:
        # Request change to an unused email
        response = client.patch("/users/me/email", json={"new_email": "newemail@test.com"}, headers=headers)
        assert response.status_code == 200
        assert mock_send.call_count == 1
        
        # Verify the target user and retrieve the token passed to the stub
        user_arg, token_arg = mock_send.call_args[0]
        assert user_arg.email == "user@test.com"
        assert user_arg.pending_email == "newemail@test.com"

        # Check DB state has updated to pending_email
        db = TestingSessionLocal()
        db_user = db.query(User).filter(User.id == uuid.UUID("33333333-3333-3333-3333-33333333333c")).first()
        assert db_user.pending_email == "newemail@test.com"
        db.close()

        # Try verification with the token
        response = client.get(f"/users/me/email/verify?token={token_arg}", headers=headers)
        assert response.status_code == 200
        assert response.json()["email"] == "newemail@test.com"

        # Verify DB is updated and pending is cleared
        db = TestingSessionLocal()
        db_user = db.query(User).filter(User.id == uuid.UUID("33333333-3333-3333-3333-33333333333c")).first()
        assert db_user.email == "newemail@test.com"
        assert db_user.pending_email is None
        db.close()


def test_email_change_conflicts_and_invalid_tokens():
    headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))

    # Conflict: target email is already taken by other@test.com
    response = client.patch("/users/me/email", json={"new_email": "other@test.com"}, headers=headers)
    assert response.status_code == 409
    assert "Email already in use" in response.json()["detail"]

    # Verify with malformed or invalid tokens
    response = client.get("/users/me/email/verify?token=completely_invalid_token")
    assert response.status_code == 400
    assert "Invalid or expired token" in response.json()["detail"]
