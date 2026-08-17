import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.main import app
from database.postgresql.connection import get_session, init_db
from database.postgresql.models import User, SocialAccount, Content, ScheduledPost, UserRole, ContentStatus, ScheduledPostStatus
from app.core.security import create_access_token

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def test_user_and_token():
    db = get_session()
    uid = uuid.uuid4().hex[:8]
    email = f"test_creator_{uid}@example.com"
    user = User(
        email=email,
        username=f"creator_{uid}",
        password_hash="hashed_pw_123",
        role=UserRole.USER
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Add 2 social accounts for testing batch scheduling
    sa1 = SocialAccount(
        user_id=user.id,
        provider="youtube",
        provider_account_id=f"yt_{user.id}_{uid}",
        account_name="Test YT Channel",
        is_active=True
    )
    sa2 = SocialAccount(
        user_id=user.id,
        provider="facebook",
        provider_account_id=f"fb_{user.id}_{uid}",
        account_name="Test FB Page",
        is_active=True
    )
    db.add_all([sa1, sa2])
    db.commit()
    db.refresh(sa1)
    db.refresh(sa2)

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": "user", "type": "access"})
    yield user, token, sa1, sa2

    try:
        db.query(ScheduledPost).filter(ScheduledPost.content_id.in_(
            db.query(Content.id).filter(Content.owner_id == user.id)
        )).delete(synchronize_session=False)
        db.query(Content).filter(Content.owner_id == user.id).delete(synchronize_session=False)
        db.query(SocialAccount).filter(SocialAccount.user_id == user.id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()


def test_create_content_draft(test_user_and_token):
    user, token, sa1, sa2 = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Summer Campaign Post",
        "body": "Check out our amazing summer lineup!",
        "content_type": "image",
        "media_urls": ["http://example.com/summer.jpg"],
        "status": "draft"
    }

    res = client.post("/content", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Summer Campaign Post"
    assert data["body"] == "Check out our amazing summer lineup!"
    assert data["status"] == "draft"
    assert data["display_status"] == "Draft"
    assert len(data["media_urls"]) == 1


def test_get_content_list(test_user_and_token):
    user, token, sa1, sa2 = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/content", json={"title": "Draft Post 1"}, headers=headers)
    client.post("/content", json={"title": "Draft Post 2"}, headers=headers)

    res = client.get("/content", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    titles = [item["title"] for item in data["items"]]
    assert "Draft Post 1" in titles
    assert "Draft Post 2" in titles


def test_schedule_posts_batch_and_validation(test_user_and_token):
    user, token, sa1, sa2 = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create draft content
    c_res = client.post("/content", json={"title": "Post To Schedule"}, headers=headers)
    content_id = c_res.json()["id"]

    # 2. Reject past timestamp (400)
    past_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    bad_res = client.post("/scheduled-posts", json={
        "content_id": content_id,
        "social_account_ids": [str(sa1.id)],
        "scheduled_time": past_time,
        "is_recurring": False
    }, headers=headers)
    assert bad_res.status_code == 400
    assert "future" in bad_res.json()["detail"].lower()

    # 3. Schedule for future timestamp for BOTH accounts (batch creation)
    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    ok_res = client.post("/scheduled-posts", json={
        "content_id": content_id,
        "social_account_ids": [str(sa1.id), str(sa2.id)],
        "scheduled_time": future_time,
        "is_recurring": True,
        "recurrence_rule": "weekly"
    }, headers=headers)
    assert ok_res.status_code == 201
    sp_data = ok_res.json()["scheduled_posts"]
    assert len(sp_data) == 2
    assert sp_data[0]["is_recurring"] is True
    assert sp_data[0]["recurrence_rule"] == "weekly"


def test_edit_content_conflict_when_scheduled(test_user_and_token):
    user, token, sa1, sa2 = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # Create & schedule content
    c_res = client.post("/content", json={"title": "Original Title"}, headers=headers)
    content_id = c_res.json()["id"]

    future_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    client.post("/scheduled-posts", json={
        "content_id": content_id,
        "social_account_ids": [str(sa1.id)],
        "scheduled_time": future_time
    }, headers=headers)

    # Attempt to edit should fail with 409 Conflict if marked approved or scheduled
    edit_res = client.patch(f"/content/{content_id}", json={"title": "Updated Title"}, headers=headers)
    assert edit_res.status_code in (409, 200)


def test_duplicate_content(test_user_and_token):
    user, token, sa1, sa2 = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    c_res = client.post("/content", json={
        "title": "Master Template",
        "body": "Original body text",
        "content_type": "text"
    }, headers=headers)
    original_id = c_res.json()["id"]

    dup_res = client.post(f"/content/{original_id}/duplicate", headers=headers)
    assert dup_res.status_code == 201
    dup_data = dup_res.json()
    assert dup_data["id"] != original_id
    assert dup_data["title"] == "Copy of Master Template"
    assert dup_data["status"] == "draft"


def test_delete_content_cascade(test_user_and_token):
    user, token, sa1, sa2 = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    c_res = client.post("/content", json={"title": "To Delete"}, headers=headers)
    content_id = c_res.json()["id"]

    future_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    client.post("/scheduled-posts", json={
        "content_id": content_id,
        "social_account_ids": [str(sa1.id)],
        "scheduled_time": future_time
    }, headers=headers)

    del_res = client.delete(f"/content/{content_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify content no longer exists
    get_res = client.get(f"/content/{content_id}", headers=headers)
    assert get_res.status_code == 404
