import json
import os
import logging
import tempfile
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.youtube import YouTubeAccount
from app.repositories.youtube_repository import YouTubeRepository

logger = logging.getLogger(__name__)

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

    # ── Video Publishing ───────────────────────────────────────────────────────

    def publish_video(
        self,
        access_token: str,
        title: str,
        description: str,
        video_url: str,
        privacy_status: str = "public",
        category_id: str = "22",   # 22 = People & Blogs
    ) -> dict:
        """
        Upload a video to YouTube via the Data API v3 resumable upload.

        Steps:
        1. Validate the video_url (must be a direct HTTP/HTTPS link to a video file).
        2. Download the video to a temporary file.
        3. Initiate a resumable-upload session → get an upload URL from Google.
        4. Stream the file to the upload URL.
        5. Return {video_id, video_url, title}.

        Supported privacy_status values: "public", "unlisted", "private"
        Category IDs: 1=Film, 10=Music, 17=Sports, 22=People&Blogs, 24=Entertainment, 28=Science
        """
        # ── Validate URL ──────────────────────────────────────────────────────
        if not video_url or not video_url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "YouTube requires a direct video file URL (e.g. .mp4, .mov). "
                    "Blob URLs and data URLs are not supported. "
                    "Please provide a public HTTPS URL pointing to a video file."
                )
            )

        # ── Check if video is a locally uploaded file ──────────────────────────
        tmp_path = None
        is_temp = True
        
        local_disk_path = None
        if "/uploads/" in video_url:
            filename = video_url.split("/uploads/")[-1]
            uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
            possible_path = os.path.join(uploads_dir, filename)
            if os.path.exists(possible_path):
                local_disk_path = possible_path

        try:
            if local_disk_path:
                logger.info(f"YouTube publish_video: using local uploaded file {local_disk_path}")
                tmp_path = local_disk_path
                is_temp = False
                ext = os.path.splitext(local_disk_path)[1].lower()
                mime = "video/mp4"
                if ext in (".mov", ".qt"):
                    mime = "video/quicktime"
                elif ext == ".webm":
                    mime = "video/webm"
                elif ext == ".avi":
                    mime = "video/x-msvideo"
            else:
                # Detect content-type from URL headers before downloading
                logger.info(f"YouTube publish_video: downloading from {video_url[:80]}...")
                head_req = urllib.request.Request(video_url, method="HEAD")
                try:
                    with urllib.request.urlopen(head_req, timeout=10) as head_resp:
                        content_type = head_resp.headers.get("Content-Type", "video/mp4")
                except Exception:
                    content_type = "video/mp4"

                # Normalise content-type
                if "mp4" in content_type:
                    ext, mime = ".mp4", "video/mp4"
                elif "quicktime" in content_type or "mov" in content_type:
                    ext, mime = ".mov", "video/quicktime"
                elif "webm" in content_type:
                    ext, mime = ".webm", "video/webm"
                elif "avi" in content_type:
                    ext, mime = ".avi", "video/x-msvideo"
                else:
                    ext, mime = ".mp4", "video/mp4"

                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                    tmp_path = tmp.name

                logger.info(f"YouTube publish_video: saving to temp file {tmp_path} ({mime})")
                urllib.request.urlretrieve(video_url, tmp_path)
            
            file_size = os.path.getsize(tmp_path)
            logger.info(f"YouTube publish_video: file ready, {file_size} bytes")

            if file_size == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Downloaded video file is empty. Please check the video URL."
                )

            # ── Step 1: Initiate resumable upload session ─────────────────────
            logger.info("YouTube publish_video: initiating resumable upload session...")
            init_url = (
                "https://www.googleapis.com/upload/youtube/v3/videos"
                "?uploadType=resumable&part=snippet,status"
            )
            metadata = {
                "snippet": {
                    "title": title[:100],           # YouTube max title length = 100
                    "description": (description or "")[:5000],
                    "categoryId": category_id,
                },
                "status": {
                    "privacyStatus": privacy_status,
                    "selfDeclaredMadeForKids": False,
                },
            }
            meta_bytes = json.dumps(metadata).encode("utf-8")
            init_headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": mime,
                "X-Upload-Content-Length": str(file_size),
            }
            init_req = urllib.request.Request(
                init_url, data=meta_bytes, headers=init_headers, method="POST"
            )
            try:
                with urllib.request.urlopen(init_req, timeout=30) as init_resp:
                    upload_url = init_resp.headers.get("Location")
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8")
                try:
                    err_json = json.loads(err_body)
                except Exception:
                    err_json = {"raw": err_body}
                logger.error(f"YouTube initiate upload failed: {e.code} {err_json}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"YouTube API rejected upload initiation: {err_json}"
                )

            if not upload_url:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="YouTube API did not return an upload URL."
                )
            logger.info(f"YouTube publish_video: upload URL obtained.")

            # ── Step 2: Upload video data ──────────────────────────────────────
            logger.info(f"YouTube publish_video: uploading {file_size} bytes...")
            with open(tmp_path, "rb") as video_file:
                video_bytes = video_file.read()

            upload_headers = {
                "Content-Type": mime,
                "Content-Length": str(file_size),
            }
            upload_req = urllib.request.Request(
                upload_url, data=video_bytes, headers=upload_headers, method="PUT"
            )
            try:
                with urllib.request.urlopen(upload_req, timeout=300) as upload_resp:
                    result_body = upload_resp.read().decode("utf-8")
                    result = json.loads(result_body) if result_body else {}
            except urllib.error.HTTPError as e:
                err_body = e.read().decode("utf-8")
                try:
                    err_json = json.loads(err_body)
                except Exception:
                    err_json = {"raw": err_body}
                logger.error(f"YouTube video upload failed: {e.code} {err_json}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"YouTube video upload failed: {err_json}"
                )

            video_id = result.get("id")
            if not video_id:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"YouTube upload completed but no video ID returned: {result}"
                )

            video_url_out = f"https://www.youtube.com/watch?v={video_id}"
            logger.info(f"YouTube publish_video: SUCCESS! video_id={video_id}, url={video_url_out}")
            return {
                "video_id": video_id,
                "video_url": video_url_out,
                "title": title,
                "privacy_status": privacy_status,
            }

        finally:
            # Clean up temp file (only if created temporarily)
            if is_temp and tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
