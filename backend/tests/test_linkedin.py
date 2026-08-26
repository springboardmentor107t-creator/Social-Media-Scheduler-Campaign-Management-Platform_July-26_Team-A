import os
import sys
import uuid
import urllib.parse
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add root workspace directories to sys.path to support imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.main import app
from database.postgresql.models import Base, User, UserRole
from database.postgresql.connection import get_db
from app.core.security import create_access_token
from app.models.linkedin import LinkedInAccount

# Setup testing in-memory SQLite database using StaticPool to persist connection
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
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


@pytest.fixture
def test_user_and_token():
    db = TestingSessionLocal()
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

    token = create_access_token({"sub": str(user.id), "email": user.email, "role": "user", "type": "access"})
    yield user, token
    db.close()


def test_linkedin_login(test_user_and_token):
    user, token = test_user_and_token
    # Test that login endpoint redirects user to LinkedIn authorization page
    res = client.get(f"/api/auth/linkedin/login?token={token}", allow_redirects=False)
    assert res.status_code == 307
    location = res.headers.get("location")
    assert "linkedin.com/oauth/v2/authorization" in location
    assert "client_id=" in location
    assert "response_type=code" in location


def test_linkedin_callback_error():
    # Test that errors forwarded from LinkedIn are handled and redirected to frontend
    res = client.get("/api/auth/linkedin/callback?error=user_cancelled_login&state=dummy", allow_redirects=False)
    assert res.status_code == 307
    location = res.headers.get("location")
    assert "error=user_cancelled_login" in location
    assert "platform=linkedin" in location


@patch("app.services.linkedin_service.LinkedInService.exchange_code")
@patch("app.services.linkedin_service.LinkedInService.fetch_profile_details")
def test_linkedin_callback_success(mock_fetch_profile, mock_exchange_code, test_user_and_token):
    user, token = test_user_and_token
    
    # 1. Generate signed state
    res_login = client.get(f"/api/auth/linkedin/login?token={token}", allow_redirects=False)
    location = res_login.headers.get("location")
    # Parse state query parameter from redirect location
    parsed = urllib.parse.urlparse(location)
    queries = urllib.parse.parse_qs(parsed.query)
    state = queries["state"][0]

    # Mock the OAuth methods
    mock_exchange_code.return_value = {
        "access_token": "mock_access_token_123",
        "refresh_token": "mock_refresh_token_123",
        "expires_in": 3600
    }
    mock_fetch_profile.return_value = {
        "profile_id": "li_profile_999",
        "profile_name": "Test User Name",
        "email": "test@linkedin.com"
    }

    # 2. Trigger redirect callback
    res_callback = client.get(f"/api/auth/linkedin/callback?code=mock_code&state={state}", allow_redirects=False)
    assert res_callback.status_code == 307
    location = res_callback.headers.get("location")
    assert "success=true" in location
    assert "platform=linkedin" in location

    # 3. Verify record was created in database
    db = TestingSessionLocal()
    account = db.query(LinkedInAccount).filter_by(user_id=user.id).first()
    assert account is not None
    assert account.profile_id == "li_profile_999"
    assert account.profile_name == "Test User Name"
    assert account.access_token == "mock_access_token_123"
    
    from database.postgresql.models import SocialAccount
    social_account = db.query(SocialAccount).filter_by(user_id=user.id, provider="linkedin").first()
    assert social_account is not None
    assert social_account.provider_account_id == "li_profile_999"
    assert social_account.account_name == "Test User Name"
    assert social_account.access_token == "mock_access_token_123"
    db.close()


def test_linkedin_status(test_user_and_token):
    user, token = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # Check initially disconnected
    res = client.get("/linkedin/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is False
    assert len(data["accounts"]) == 0

    # Add mock connected account to DB
    db = TestingSessionLocal()
    account = LinkedInAccount(
        user_id=user.id,
        profile_id="li_profile_999",
        profile_name="LinkedIn Profile Name",
        email="test@linkedin.com",
        access_token="token_abc",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db.add(account)
    db.commit()
    db.close()

    # Check status again
    res = client.get("/linkedin/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert len(data["accounts"]) == 1
    assert data["accounts"][0]["profile_name"] == "LinkedIn Profile Name"


def test_linkedin_disconnect(test_user_and_token):
    user, token = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}

    # Add mock connected account
    db = TestingSessionLocal()
    account = LinkedInAccount(
        user_id=user.id,
        profile_id="li_profile_999",
        profile_name="LinkedIn Profile Name",
        email="test@linkedin.com",
        access_token="token_abc",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db.add(account)
    
    # Add corresponding SocialAccount
    from database.postgresql.models import SocialAccount
    social_account = SocialAccount(
        user_id=user.id,
        provider="linkedin",
        provider_account_id="li_profile_999",
        account_name="LinkedIn Profile Name",
        access_token="token_abc",
        is_active=True
    )
    db.add(social_account)
    db.commit()
    db.close()

    # Disconnect
    res = client.delete("/linkedin/disconnect", headers=headers)
    assert res.status_code == 200
    assert "disconnected successfully" in res.json()["message"]

    # Verify deleted from DB
    db = TestingSessionLocal()
    account_db = db.query(LinkedInAccount).filter_by(user_id=user.id).first()
    assert account_db is None
    
    social_db = db.query(SocialAccount).filter_by(user_id=user.id, provider="linkedin").first()
    assert social_db is None
    db.close()


@patch("app.services.linkedin_service.LinkedInService.publish_post")
def test_linkedin_publish_now_success(mock_publish, test_user_and_token):
    user, token = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}
    db = TestingSessionLocal()

    # 1. Create a LinkedIn connected account & corresponding SocialAccount
    account = LinkedInAccount(
        user_id=user.id,
        profile_id="li_profile_999",
        profile_name="LinkedIn Profile Name",
        email="test@linkedin.com",
        access_token="token_abc",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db.add(account)
    
    from database.postgresql.models import SocialAccount, Content, ScheduledPost
    social_account = SocialAccount(
        user_id=user.id,
        provider="linkedin",
        provider_account_id="li_profile_999",
        account_name="LinkedIn Profile Name",
        access_token="token_abc",
        is_active=True
    )
    db.add(social_account)
    db.commit()
    
    # 2. Create content draft
    content = Content(
        owner_id=user.id,
        title="Immediate post title",
        body="This is the post content!",
        media_urls=["https://example.com/image.jpg"]
    )
    db.add(content)
    db.commit()
    
    # Mock return values for publish_post
    mock_publish.return_value = {"id": "urn:li:share:12345"}
    
    # 3. Request immediate scheduling/publishing
    res = client.post("/scheduled-posts", json={
        "content_id": str(content.id),
        "social_account_ids": [str(social_account.id)],
        "scheduled_time": datetime.now(timezone.utc).isoformat(),
        "publish_now": True,
        "is_recurring": False
    }, headers=headers)
    
    assert res.status_code == 201
    mock_publish.assert_called_once_with(
        access_token="token_abc",
        profile_id="li_profile_999",
        text_content="This is the post content!",
        media_urls=["https://example.com/image.jpg"]
    )
    db.close()


@patch("app.services.linkedin_service.LinkedInService.fetch_follower_count")
def test_linkedin_sync_analytics_updates_metrics(mock_fetch_followers, test_user_and_token):
    user, token = test_user_and_token
    headers = {"Authorization": f"Bearer {token}"}
    db = TestingSessionLocal()
    
    account = LinkedInAccount(
        user_id=user.id,
        profile_id="li_profile_999",
        profile_name="LinkedIn Profile Name",
        email="test@linkedin.com",
        access_token="token_abc",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1)
    )
    db.add(account)
    
    from database.postgresql.models import SocialAccount, Content, ScheduledPost, ScheduledPostMetrics, ScheduledPostStatus
    social_account = SocialAccount(
        user_id=user.id,
        provider="linkedin",
        provider_account_id="li_profile_999",
        account_name="LinkedIn Profile Name",
        access_token="token_abc",
        is_active=True
    )
    db.add(social_account)
    db.commit()
    
    content = Content(
        owner_id=user.id,
        title="Understanding authentication and OAuth 2.0",
        body="This is content"
    )
    db.add(content)
    db.commit()
    
    scheduled_post = ScheduledPost(
        content_id=content.id,
        social_account_id=social_account.id,
        scheduled_time=datetime.now(timezone.utc),
        status=ScheduledPostStatus.PUBLISHED
    )
    db.add(scheduled_post)
    db.commit()
    
    mock_fetch_followers.return_value = 1500
    
    res = client.post("/api/linkedin/sync-analytics", headers=headers)
    assert res.status_code == 200
    assert res.json()["accounts_synced"] == 1
    
    metric = db.query(ScheduledPostMetrics).filter_by(scheduled_post_id=scheduled_post.id).first()
    assert metric is not None
    assert metric.views > 0
    assert metric.reach > 0
    assert metric.impressions == metric.views
    
    db.close()

