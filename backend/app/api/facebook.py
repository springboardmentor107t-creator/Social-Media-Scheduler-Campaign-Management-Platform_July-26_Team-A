import uuid
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import List
from uuid import UUID
from jose import jwt

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database.postgresql.connection import get_db
from database.postgresql.models import User
from app.core.config import settings
from app.core.security import decode_token
from app.presentation.dependencies.auth import get_current_user
from app.models.facebook import FacebookAccount, FacebookPage
from app.schemas.facebook import (
    FacebookStatusResponse,
    FacebookAccountResponse,
    FacebookPageResponse,
    FacebookPostTextRequest,
    FacebookPostImageRequest,
    FacebookPostVideoRequest,
    FacebookPostResponse,
)
from app.repositories.facebook_repository import FacebookRepository
from app.services.facebook_service import FacebookService

router = APIRouter(tags=["Facebook Integration"])

def get_facebook_service(db: Session = Depends(get_db)) -> FacebookService:
    repo = FacebookRepository(db)
    return FacebookService(repo)


@router.get("/auth/facebook/login")
def facebook_login(
    token: str = Query(..., description="JWT user access token"),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Step 4: Implement OAuth Login.
    Validates user token, issues a signed CSRF state token, and redirects to Facebook OAuth URL.
    """
    payload = decode_token(token)
    user_id_str = payload.get("sub")
    token_type = payload.get("type")

    if not user_id_str or token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format"
        )

    # Issue signed CSRF state parameter valid for 10 minutes
    state_payload = {
        "sub": str(user_id),
        "nonce": uuid.uuid4().hex,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    state = jwt.encode(state_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    auth_url = facebook_service.get_auth_url(state)
    return RedirectResponse(auth_url)


@router.get("/auth/facebook/callback")
def facebook_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Steps 5, 6, 7, 8, 9: Handle OAuth Callback.
    1. Validates code & state
    2. Exchanges code for User Access Token
    3. Fetches User Profile (/me)
    4. Fetches User Pages (/me/accounts) & Page Access Tokens
    5. Saves Facebook Account and Pages to Database
    """
    frontend_url = "http://localhost:5173/dashboard/connect"

    if error:
        detail_msg = error_description or error
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(detail_msg)}")

    if not code or not state:
        return RedirectResponse(f"{frontend_url}?error=Missing%20code%20or%20state%20parameter")

    # Validate state parameter
    try:
        state_payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = state_payload.get("sub")
        if not user_id_str:
            raise ValueError("State payload missing sub claim")
        user_id = UUID(user_id_str)
    except Exception:
        return RedirectResponse(f"{frontend_url}?error=Invalid%20or%20expired%20OAuth%20state")

    try:
        # Step 6: Exchange code for user access token
        token_data = facebook_service.exchange_code(code)
        access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in")
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in) if expires_in else None

        # Step 7: Get user profile
        profile = facebook_service.fetch_user_profile(access_token)

        # Step 8: Get user pages & page access tokens
        pages_data = facebook_service.fetch_user_pages(access_token)

        # Step 9: Store data in database
        account = facebook_service.repository.create_or_update_account(
            user_id=user_id,
            facebook_id=profile["facebook_id"],
            name=profile["name"],
            email=profile.get("email"),
            access_token=access_token,
            expires_at=expires_at
        )

        facebook_service.repository.sync_account_pages(account.id, pages_data)

        return RedirectResponse(f"{frontend_url}?success=true&platform=facebook")
    except HTTPException as e:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(e.detail)}")
    except Exception as e:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(str(e))}")


@router.get("/facebook/status", response_model=FacebookStatusResponse)
def facebook_status(
    current_user: User = Depends(get_current_user),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Returns connection status and profile details of connected Facebook accounts & pages.
    """
    accounts = facebook_service.repository.list_accounts_by_user_id(current_user.id)
    connected = len(accounts) > 0
    return {
        "connected": connected,
        "accounts": accounts
    }


@router.get("/facebook/pages", response_model=List[FacebookPageResponse])
def facebook_pages(
    current_user: User = Depends(get_current_user),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Returns all connected Facebook Pages for the current authenticated user.
    """
    accounts = facebook_service.repository.list_accounts_by_user_id(current_user.id)
    all_pages = []
    for acc in accounts:
        all_pages.extend(acc.pages)
    return all_pages


@router.delete("/facebook/disconnect", status_code=status.HTTP_200_OK)
def facebook_disconnect(
    current_user: User = Depends(get_current_user),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Disconnect Facebook integration and remove stored tokens and page credentials.
    """
    accounts = facebook_service.repository.list_accounts_by_user_id(current_user.id)
    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Facebook accounts found."
        )

    for acc in accounts:
        facebook_service.repository.delete_account(acc)

    return {"message": "Facebook account disconnected successfully."}


@router.post("/facebook/post/text", response_model=FacebookPostResponse)
def facebook_post_text(
    req: FacebookPostTextRequest,
    current_user: User = Depends(get_current_user),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Step 10: Publish text post to a Facebook Page using stored Page Access Token.
    """
    page = facebook_service.repository.get_page_by_page_id(req.page_id)
    if not page or page.account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified Facebook Page not found or not owned by user."
        )

    result = facebook_service.post_text(
        page_id=page.page_id,
        page_access_token=page.page_access_token,
        message=req.message
    )
    return result


@router.post("/facebook/post/image", response_model=FacebookPostResponse)
def facebook_post_image(
    req: FacebookPostImageRequest,
    current_user: User = Depends(get_current_user),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Step 10: Publish image post to a Facebook Page using stored Page Access Token.
    """
    page = facebook_service.repository.get_page_by_page_id(req.page_id)
    if not page or page.account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified Facebook Page not found or not owned by user."
        )

    result = facebook_service.post_image(
        page_id=page.page_id,
        page_access_token=page.page_access_token,
        caption=req.caption,
        image_url=req.image_url
    )
    return result


@router.post("/facebook/post/video", response_model=FacebookPostResponse)
def facebook_post_video(
    req: FacebookPostVideoRequest,
    current_user: User = Depends(get_current_user),
    facebook_service: FacebookService = Depends(get_facebook_service)
):
    """
    Step 10: Publish video post to a Facebook Page using stored Page Access Token.
    """
    page = facebook_service.repository.get_page_by_page_id(req.page_id)
    if not page or page.account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified Facebook Page not found or not owned by user."
        )

    result = facebook_service.post_video(
        page_id=page.page_id,
        page_access_token=page.page_access_token,
        title=req.title,
        description=req.description,
        video_url=req.video_url
    )
    return result
