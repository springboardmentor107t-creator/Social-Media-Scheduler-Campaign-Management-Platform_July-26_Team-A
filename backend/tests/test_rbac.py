import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import jwt

# Add root workspace directories to sys.path to support imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from database.postgresql.models import Base, User, UserRole, Content
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
    
    # Create test users: admin, manager, user, user2
    admin_user = User(
        id=uuid.UUID("11111111-1111-1111-1111-11111111111a"),
        email="admin@test.com",
        username="admin",
        password_hash="dummy_hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    manager_user = User(
        id=uuid.UUID("22222222-2222-2222-2222-22222222222b"),
        email="manager@test.com",
        username="manager",
        password_hash="dummy_hash",
        role=UserRole.MANAGER,
        is_active=True
    )
    regular_user = User(
        id=uuid.UUID("33333333-3333-3333-3333-33333333333c"),
        email="user@test.com",
        username="user",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True
    )
    regular_user2 = User(
        id=uuid.UUID("55555555-5555-5555-5555-55555555555e"),
        email="user2@test.com",
        username="user2",
        password_hash="dummy_hash",
        role=UserRole.USER,
        is_active=True
    )
    
    db.add(admin_user)
    db.add(manager_user)
    db.add(regular_user)
    db.add(regular_user2)
    db.commit()
    db.close()
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def get_auth_headers(email: str, role: str, user_id: uuid.UUID, expires_delta: timedelta = None) -> dict:
    token_data = {"sub": str(user_id), "email": email, "role": role}
    token = create_access_token(token_data, expires_delta=expires_delta)
    return {"Authorization": f"Bearer {token}"}


client = TestClient(app)


def test_users_me_success():
    # Admin
    admin_headers = get_auth_headers("admin@test.com", "admin", uuid.UUID("11111111-1111-1111-1111-11111111111a"))
    response = client.get("/users/me", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["role"] == "admin"

    # Manager
    manager_headers = get_auth_headers("manager@test.com", "manager", uuid.UUID("22222222-2222-2222-2222-22222222222b"))
    response = client.get("/users/me", headers=manager_headers)
    assert response.status_code == 200
    assert response.json()["role"] == "manager"

    # User
    user_headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    response = client.get("/users/me", headers=user_headers)
    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_users_list_rbac():
    # Admin (should pass)
    admin_headers = get_auth_headers("admin@test.com", "admin", uuid.UUID("11111111-1111-1111-1111-11111111111a"))
    response = client.get("/users", headers=admin_headers)
    assert response.status_code == 200
    # 4 users now (admin, manager, user, user2)
    assert len(response.json()) == 4

    # Manager (should fail with formatted 403)
    manager_headers = get_auth_headers("manager@test.com", "manager", uuid.UUID("22222222-2222-2222-2222-22222222222b"))
    response = client.get("/users", headers=manager_headers)
    assert response.status_code == 403
    assert response.json() == {
        "detail": "Insufficient permissions",
        "required_role": "admin",
        "your_role": "manager"
    }

    # User (should fail with formatted 403)
    user_headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    response = client.get("/users", headers=user_headers)
    assert response.status_code == 403
    assert response.json() == {
        "detail": "Insufficient permissions",
        "required_role": "admin",
        "your_role": "user"
    }


def test_change_role_rules():
    admin_headers = get_auth_headers("admin@test.com", "admin", uuid.UUID("11111111-1111-1111-1111-11111111111a"))
    
    # 1. Admin updates regular user to manager
    response = client.patch(
        "/users/33333333-3333-3333-3333-33333333333c/role?role=manager",
        headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["role"] == "manager"

    # 2. Admin cannot change their own role
    response = client.patch(
        "/users/11111111-1111-1111-1111-11111111111a/role?role=manager",
        headers=admin_headers
    )
    assert response.status_code == 400
    assert "cannot change their own roles" in response.json()["detail"]

    # 3. Cannot demote the last remaining active Admin
    response = client.patch(
        "/users/11111111-1111-1111-1111-11111111111a/role?role=user",
        headers=admin_headers
    )
    # It fails because you cannot self-demote (Rule 1)
    assert response.status_code == 400

    # Let's create another admin to test demotion rule
    db = TestingSessionLocal()
    new_admin = User(
        id=uuid.UUID("44444444-4444-4444-4444-44444444444d"),
        email="admin2@test.com",
        username="admin2",
        password_hash="dummy_hash",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(new_admin)
    db.commit()
    db.close()

    # Now Admin 1 demotes Admin 2 -> should pass since Admin 1 is still active admin
    response = client.patch(
        "/users/44444444-4444-4444-4444-44444444444d/role?role=user",
        headers=admin_headers
    )
    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_team_members_rbac():
    # Manager (should pass)
    manager_headers = get_auth_headers("manager@test.com", "manager", uuid.UUID("22222222-2222-2222-2222-22222222222b"))
    response = client.get("/team/team-1/members", headers=manager_headers)
    assert response.status_code == 200

    # Admin (should pass - hierarchy)
    admin_headers = get_auth_headers("admin@test.com", "admin", uuid.UUID("11111111-1111-1111-1111-11111111111a"))
    response = client.get("/team/team-1/members", headers=admin_headers)
    assert response.status_code == 200

    # User (should fail with 403)
    user_headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    response = client.get("/team/team-1/members", headers=user_headers)
    assert response.status_code == 403
    assert response.json()["required_role"] == "manager or higher"


def test_content_approve_rbac():
    # Let's create content first using user
    user_headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    create_resp = client.post("/content", json={"title": "Draft Post"}, headers=user_headers)
    assert create_resp.status_code == 201
    content_id = create_resp.json()["id"]

    # User tries to approve (should fail)
    response = client.post(f"/content/{content_id}/approve", headers=user_headers)
    assert response.status_code == 403

    # Manager approves (should succeed)
    manager_headers = get_auth_headers("manager@test.com", "manager", uuid.UUID("22222222-2222-2222-2222-22222222222b"))
    response = client.post(f"/content/{content_id}/approve", headers=manager_headers)
    assert response.status_code == 200
    assert response.json()["is_approved"] is True


def test_content_delete_ownership_or_role():
    # User 1 creates content
    user1_headers = get_auth_headers("user@test.com", "user", uuid.UUID("33333333-3333-3333-3333-33333333333c"))
    create_resp = client.post("/content", json={"title": "User Post"}, headers=user1_headers)
    content_id = create_resp.json()["id"]

    # Another regular user tries to delete (should fail with 403)
    user2_headers = get_auth_headers("user2@test.com", "user", uuid.UUID("55555555-5555-5555-5555-55555555555e"))
    response = client.delete(f"/content/{content_id}", headers=user2_headers)
    assert response.status_code == 403
    assert response.json()["required_role"] == "Owner or manager or higher"

    # Owner (User 1) deletes their own content (should succeed)
    response = client.delete(f"/content/{content_id}", headers=user1_headers)
    assert response.status_code == 200

    # Recreate content for manager test
    create_resp = client.post("/content", json={"title": "User Post 2"}, headers=user1_headers)
    content_id2 = create_resp.json()["id"]

    # Manager deletes (should succeed even though not owner)
    manager_headers = get_auth_headers("manager@test.com", "manager", uuid.UUID("22222222-2222-2222-2222-22222222222b"))
    response = client.delete(f"/content/{content_id2}", headers=manager_headers)
    assert response.status_code == 200


def test_admin_settings_rbac():
    admin_headers = get_auth_headers("admin@test.com", "admin", uuid.UUID("11111111-1111-1111-1111-11111111111a"))
    response = client.get("/admin/settings", headers=admin_headers)
    assert response.status_code == 200

    manager_headers = get_auth_headers("manager@test.com", "manager", uuid.UUID("22222222-2222-2222-2222-22222222222b"))
    response = client.get("/admin/settings", headers=manager_headers)
    assert response.status_code == 403


def test_expired_token():
    # Expired token (delta = -10 seconds)
    expired_headers = get_auth_headers(
        "admin@test.com", "admin", 
        uuid.UUID("11111111-1111-1111-1111-11111111111a"), 
        expires_delta=timedelta(seconds=-10)
    )
    response = client.get("/users/me", headers=expired_headers)
    assert response.status_code == 401


def test_tampered_token():
    # Token signed with a different key
    token_data = {
        "sub": "11111111-1111-1111-1111-11111111111a",
        "email": "admin@test.com",
        "role": "admin"
    }
    tampered_token = jwt.encode(token_data, "WRONG_SECRET_KEY", algorithm=settings.JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {tampered_token}"}
    
    response = client.get("/users/me", headers=headers)
    assert response.status_code == 401
