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
from app.models.youtube import YouTubeAccount
from app.schemas.youtube import YouTubeAccountResponse, YouTubeStatusResponse
from app.repositories.youtube_repository import YouTubeRepository
from app.services.youtube_service import YouTubeService

# We expose routes directly without a prefix here so we can match
# the specific paths: /auth/youtube/... and /youtube/...
router = APIRouter(tags=["YouTube Integration"])

def get_youtube_service(db: Session = Depends(get_db)) -> YouTubeService:
    repo = YouTubeRepository(db)
    return YouTubeService(repo)

@router.get("/auth/youtube/login")
def youtube_login(
    token: str = Query(..., description="JWT user access token"),
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Kicks off the YouTube OAuth login flow.
    Validates user token, issues a signed state token, and redirects to Google.
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

    # Issue a signed, short-lived JWT state parameter for CSRF validation
    state_payload = {
        "sub": str(user_id),
        "nonce": uuid.uuid4().hex,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    state = jwt.encode(state_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    auth_url = youtube_service.get_auth_url(state)
    return RedirectResponse(auth_url)


@router.get("/auth/youtube/callback")
def youtube_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Google OAuth redirect callback.
    Exchanges auth code for tokens, retrieves channel info, and saves to database.
    """
    frontend_url = "http://localhost:5173/dashboard/connect"
    
    if error:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(error)}")
        
    if not code or not state:
        return RedirectResponse(f"{frontend_url}?error=Missing%20code%20or%20state%20parameter")

    # Decode and validate state parameter
    try:
        state_payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = state_payload.get("sub")
        if not user_id_str:
            raise ValueError("State payload is missing subject claim")
        user_id = UUID(user_id_str)
    except Exception:
        return RedirectResponse(f"{frontend_url}?error=Invalid%20or%20expired%20OAuth%20state")

    # Perform OAuth code exchange and API sync
    try:
        token_data = youtube_service.exchange_code(code)
        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Retrieve YouTube Channel info and Google email
        channel_details = youtube_service.fetch_channel_details(access_token)
        email = youtube_service.fetch_user_email(access_token)

        # Save to database
        youtube_service.repository.create_or_update(
            user_id=user_id,
            channel_id=channel_details["channel_id"],
            channel_name=channel_details["channel_name"],
            email=email,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at
        )

        return RedirectResponse(f"{frontend_url}?success=true")
    except HTTPException as e:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(e.detail)}")
    except Exception as e:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(str(e))}")


@router.delete("/youtube/disconnect", status_code=status.HTTP_200_OK)
def youtube_disconnect(
    current_user: User = Depends(get_current_user),
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Disconnect YouTube integration.
    Revokes authorization token with Google and deletes local database record.
    """
    accounts = youtube_service.repository.list_by_user_id(current_user.id)
    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected YouTube accounts found."
        )

    # Disconnect all linked channels for the user
    for account in accounts:
        youtube_service.disconnect_account(account)

    return {"message": "YouTube account disconnected successfully."}


@router.get("/youtube/status", response_model=YouTubeStatusResponse)
def youtube_status(
    current_user: User = Depends(get_current_user),
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Returns connection status and profile details of connected YouTube accounts.
    Silently refreshes access tokens if they are expired or expiring soon.
    """
    accounts = youtube_service.repository.list_by_user_id(current_user.id)
    refreshed_accounts = []
    
    for account in accounts:
        try:
            # Check and perform silent refresh before returning status
            refreshed = youtube_service.refresh_access_token_if_expired(account)
            refreshed_accounts.append(refreshed)
        except Exception:
            # If silent refresh fails (e.g. revoked at Google dashboard),
            # the service deleted the database record, so skip it.
            continue
            
    connected = len(refreshed_accounts) > 0
    return {
        "connected": connected,
        "accounts": refreshed_accounts
    }


@router.get("/youtube/accounts", response_model=List[YouTubeAccountResponse])
def youtube_accounts(
    current_user: User = Depends(get_current_user),
    youtube_service: YouTubeService = Depends(get_youtube_service)
):
    """
    Returns a list of all connected YouTube accounts for the current user.
    """
    accounts = youtube_service.repository.list_by_user_id(current_user.id)
    return accounts
