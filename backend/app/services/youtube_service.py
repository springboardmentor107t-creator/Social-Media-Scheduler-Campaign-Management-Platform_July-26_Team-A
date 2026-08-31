import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.youtube import YouTubeAccount
from app.repositories.youtube_repository import YouTubeRepository

class YouTubeService:
    def __init__(self, repository: YouTubeRepository):
        self.repository = repository

    def get_auth_url(self, state: str) -> str:
        """
        Generate Google OAuth authorization URL.
        Includes access_type=offline and prompt=consent to guarantee refresh token is returned.
        """
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        scopes = [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/userinfo.email"
        ]
        
        params = {
            "client_id": settings.YOUTUBE_CLIENT_ID,
            "redirect_uri": settings.YOUTUBE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "access_type": "offline",
            "prompt": "consent"
        }
        return f"{base_url}?{urllib.parse.urlencode(params)}"

    def _make_request(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[dict] = None,
        data: Optional[dict] = None
    ) -> dict:
        headers = headers or {}
        req_data = None
        
        if data:
            if headers.get("Content-Type") == "application/x-www-form-urlencoded":
                req_data = urllib.parse.urlencode(data).encode("utf-8")
            else:
                if "Content-Type" not in headers:
                    headers["Content-Type"] = "application/json"
                req_data = json.dumps(data).encode("utf-8")

        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as response:
                body = response.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
            except Exception:
                err_json = {"error": err_body}
            
            # Check for YouTube API Quota Exhaustion
            # Format: {"error": {"errors": [{"domain": "youtube.quota", "reason": "quotaExceeded", ...}]}}
            if isinstance(err_json, dict) and "error" in err_json:
                error_data = err_json["error"]
                if isinstance(error_data, dict) and "errors" in error_data:
                    reasons = [err.get("reason") for err in error_data["errors"] if isinstance(err, dict)]
                    if "quotaExceeded" in reasons:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="YouTube API daily quota has been exhausted. Please try again later."
                        )
            
            raise HTTPException(
                status_code=e.code,
                detail=f"Google API request failed: {err_json}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error calling Google APIs: {str(e)}"
            )

    def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for access and refresh tokens.
        """
        url = "https://oauth2.googleapis.com/token"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "code": code,
            "client_id": settings.YOUTUBE_CLIENT_ID,
            "client_secret": settings.YOUTUBE_CLIENT_SECRET,
            "redirect_uri": settings.YOUTUBE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        token_data = self._make_request(url, method="POST", headers=headers, data=data)
        if "refresh_token" not in token_data:
            token_data["refresh_token"] = ""
        return token_data

    def fetch_channel_details(self, access_token: str) -> dict:
        """
        Fetch YouTube channel details (Channel ID and Name) via channels.list Data API.
        """
        url = "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"
        headers = {"Authorization": f"Bearer {access_token}"}
        res = self._make_request(url, method="GET", headers=headers)
        
        items = res.get("items", [])
        if not items:
            email = self.fetch_user_email(access_token)
            channel_name = email.split('@')[0] if email else "YouTube Account"
            channel_id = f"UC_{hash(email) & 0xFFFFFFFF}" if email else "UC_default"
            return {
                "channel_id": channel_id,
                "channel_name": f"{channel_name} (YouTube)"
            }
        
        snippet = items[0].get("snippet", {})
        return {
            "channel_id": items[0].get("id"),
            "channel_name": snippet.get("title", "Unknown Channel")
        }

    def fetch_user_email(self, access_token: str) -> Optional[str]:
        """
        Fetch authorized Google account email.
        """
        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        res = self._make_request(url, method="GET", headers=headers)
        return res.get("email")

    def refresh_access_token_if_expired(self, account: YouTubeAccount) -> YouTubeAccount:
        """
        Silently refresh the access token if it is expired or close to expiry.
        """
        expires_at = account.expires_at
        if expires_at.tzinfo is not None:
            now = datetime.now(timezone.utc)
        else:
            now = datetime.now()

        # Check if expired or expiring in under 60 seconds
        if expires_at > now + timedelta(seconds=60):
            return account

        if not account.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No refresh token stored for this account. Re-authorization required."
            )

        url = "https://oauth2.googleapis.com/token"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "client_id": settings.YOUTUBE_CLIENT_ID,
            "client_secret": settings.YOUTUBE_CLIENT_SECRET,
            "refresh_token": account.refresh_token,
            "grant_type": "refresh_token"
        }
        
        try:
            token_data = self._make_request(url, method="POST", headers=headers, data=data)
        except HTTPException as e:
            # If refresh fails because the grant is invalid/revoked
            if "invalid_grant" in str(e.detail):
                # Clean up local stale record
                self.repository.delete(account)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google authorization was revoked or expired. Please reconnect your YouTube account."
                )
            raise e
            
        new_access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600)
        new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        # Some refresh token responses might not include a new refresh token unless rotated
        new_refresh_token = token_data.get("refresh_token")
        
        return self.repository.create_or_update(
            user_id=account.user_id,
            channel_id=account.channel_id,
            channel_name=account.channel_name,
            email=account.email,
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_at=new_expires_at
        )

    def disconnect_account(self, account: YouTubeAccount) -> None:
        """
        Revoke token with Google and delete local database record.
        """
        token_to_revoke = account.refresh_token or account.access_token
        if token_to_revoke:
            url = "https://oauth2.googleapis.com/revoke"
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            data = {"token": token_to_revoke}
            try:
                # Fire and forget Google revocation
                self._make_request(url, method="POST", headers=headers, data=data)
            except Exception:
                # Even if Google revocation fails (e.g. token already expired/invalid),
                # we continue to remove the local DB record.
                pass
                
        self.repository.delete(account)
