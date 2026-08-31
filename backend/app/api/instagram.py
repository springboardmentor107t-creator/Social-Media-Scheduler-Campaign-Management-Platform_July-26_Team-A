import uuid
import urllib.parse
import requests
from datetime import datetime, timezone, timedelta
from typing import List
from uuid import UUID
from jose import jwt

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database.postgresql.connection import get_db
from database.postgresql.models import User, SocialAccount
from app.core.config import settings
from app.core.security import decode_token
from app.presentation.dependencies.auth import get_current_user

router = APIRouter(tags=["Instagram Integration"])

@router.get("/auth/instagram/login")
def instagram_login(
    token: str = Query(..., description="JWT user access token")
):
    """
    Kicks off the Instagram OAuth login flow.
    Validates user token, issues a signed state token, and redirects to Instagram.
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
    
    base_url = "https://www.instagram.com/oauth/authorize"
    scopes = [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
        "instagram_business_manage_insights",
    ]
    params = {
        "client_id": settings.INSTAGRAM_APP_ID,
        "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
        "scope": ",".join(scopes),
        "response_type": "code",
        "state": state
    }
    auth_url = f"{base_url}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(auth_url)


@router.get("/auth/instagram/callback")
def instagram_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_reason: str = Query(None),
    error_description: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    Instagram OAuth redirect callback.
    Exchanges auth code for tokens, retrieves profile info, and saves to database.
    """
    frontend_url = f"{settings.FRONTEND_URL}/dashboard/connect"
    
    if error:
        detail_msg = error_description or error_reason or error
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(detail_msg)}&platform=instagram")
        
    if not code or not state:
        return RedirectResponse(f"{frontend_url}?error=Missing%20code%20or%20state%20parameter&platform=instagram")

    # Decode and validate state parameter
    try:
        state_payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = state_payload.get("sub")
        if not user_id_str:
            raise ValueError("State payload is missing subject claim")
        user_id = UUID(user_id_str)
    except Exception:
        return RedirectResponse(f"{frontend_url}?error=Invalid%20or%20expired%20OAuth%20state&platform=instagram")

    # Perform OAuth code exchange
    try:
        token_url = "https://api.instagram.com/oauth/access_token"
        payload = {
            "client_id": settings.INSTAGRAM_APP_ID,
            "client_secret": settings.INSTAGRAM_APP_SECRET,
            "grant_type": "authorization_code",
            "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
            "code": code
        }
        res = requests.post(token_url, data=payload, timeout=15)
        res_json = res.json()
        
        if res.status_code != 200 or "access_token" not in res_json:
            error_msg = res_json.get("error_message", res.text)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Instagram token exchange failed: {error_msg}"
            )
            
        access_token = res_json["access_token"]
        instagram_user_id = str(res_json.get("user_id", ""))

        # Retrieve Instagram profile info
        profile_url = f"https://graph.instagram.com/me?fields=id,username&access_token={access_token}"
        profile_res = requests.get(profile_url, timeout=15)
        profile_json = profile_res.json()
        
        if profile_res.status_code != 200 or "username" not in profile_json:
            username = f"Instagram User {instagram_user_id[:6]}"
        else:
            username = profile_json["username"]

        # Save to general SocialAccount table
        social_acc = db.query(SocialAccount).filter(
            SocialAccount.user_id == user_id,
            SocialAccount.provider == "instagram",
            SocialAccount.provider_account_id == instagram_user_id
        ).first()
        
        if social_acc:
            social_acc.account_name = username
            social_acc.access_token = access_token
            social_acc.is_active = True
        else:
            social_acc = SocialAccount(
                user_id=user_id,
                provider="instagram",
                provider_account_id=instagram_user_id,
                account_name=username,
                access_token=access_token,
                is_active=True
            )
            db.add(social_acc)
        db.commit()

        return RedirectResponse(f"{frontend_url}?success=true&platform=instagram")
    except HTTPException as e:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(e.detail)}&platform=instagram")
    except Exception as e:
        return RedirectResponse(f"{frontend_url}?error={urllib.parse.quote(str(e))}&platform=instagram")


@router.delete("/instagram/disconnect", status_code=status.HTTP_200_OK)
def instagram_disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Disconnect Instagram integration.
    """
    social_accs = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user.id,
        SocialAccount.provider == "instagram"
    ).all()
    
    if not social_accs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No connected Instagram accounts found."
        )

    for acc in social_accs:
        db.delete(acc)
    db.commit()

    return {"message": "Instagram account disconnected successfully."}


@router.get("/instagram/status")
def instagram_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns connection status and profile details of connected Instagram accounts.
    """
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user.id,
        SocialAccount.provider == "instagram",
        SocialAccount.is_active == True
    ).all()
    
    connected = len(accounts) > 0
    accounts_list = [{"instagram_id": a.provider_account_id, "username": a.account_name} for a in accounts]
    
    return {
        "connected": connected,
        "accounts": accounts_list
    }
