import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.linkedin import LinkedInAccount
from app.repositories.linkedin_repository import LinkedInRepository

class LinkedInService:
    def __init__(self, repository: LinkedInRepository):
        self.repository = repository

    def get_auth_url(self, state: str) -> str:
        """
        Generate LinkedIn OAuth authorization URL.
        Uses scopes required for profile details and publishing posts.
        """
        base_url = "https://www.linkedin.com/oauth/v2/authorization"
        scopes = ["openid", "profile", "email", "w_member_social"]
        
        params = {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
            "state": state,
            "scope": " ".join(scopes),
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
            
            raise HTTPException(
                status_code=e.code,
                detail=f"LinkedIn API request failed: {err_json}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error calling LinkedIn APIs: {str(e)}"
            )

    def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for access and refresh tokens.
        """
        url = "https://www.linkedin.com/oauth/v2/accessToken"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        }
        return self._make_request(url, method="POST", headers=headers, data=data)

    def fetch_profile_details(self, access_token: str) -> dict:
        """
        Fetch LinkedIn user profile details (URN and Display Name) via userinfo.
        """
        url = "https://api.linkedin.com/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        res = self._make_request(url, method="GET", headers=headers)
        
        sub = res.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Could not retrieve LinkedIn profile information."
            )
        
        return {
            "profile_id": sub,
            "profile_name": res.get("name", "LinkedIn Member"),
            "email": res.get("email"),
            "picture": res.get("picture"),
            "locale": res.get("locale", {})
        }

    def publish_post(self, access_token: str, profile_id: str, text_content: str, media_urls: Optional[List[str]] = None) -> dict:
        """
        Publish a post to the connected LinkedIn member's profile using ugcPosts API.
        """
        person_urn = f"urn:li:person:{profile_id}" if not profile_id.startswith("urn:") else profile_id
        url = "https://api.linkedin.com/v2/ugcPosts"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json"
        }
        
        # Prepare UGC Share content
        share_content = {
            "shareCommentary": {
                "text": text_content
            }
        }
        
        if media_urls and len(media_urls) > 0:
            share_content["shareMediaCategory"] = "ARTICLE"
            share_content["media"] = [
                {
                    "status": "READY",
                    "description": {
                        "text": "Shared Media"
                    },
                    "originalUrl": url_str,
                    "title": {
                        "text": "Post Attachment"
                    }
                } for url_str in media_urls[:1] # LinkedIn ARTICLE share supports 1 link
            ]
        else:
            share_content["shareMediaCategory"] = "NONE"

        payload = {
            "author": person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": share_content
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }

        return self._make_request(url, method="POST", headers=headers, data=payload)



    def fetch_follower_count(self, access_token: str, person_urn: str) -> int:
        """
        Attempt to fetch follower count for the connected LinkedIn member.
        Tries multiple endpoint variants; returns 0 if none are accessible.
        """
        attempts = [
            # Attempt 1: versioned REST API (newer LinkedIn API)
            {
                "url": f"https://api.linkedin.com/rest/memberFollowers?q=followedMember&followedMember={urllib.parse.quote(person_urn, safe='')}&count=0",
                "headers": {
                    "Authorization": f"Bearer {access_token}",
                    "LinkedIn-Version": "202504",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                "key": "paging.total",
            },
            # Attempt 2: networkSizes (older v2 API)
            {
                "url": f"https://api.linkedin.com/v2/networkSizes/{urllib.parse.quote(person_urn, safe='')}?edgeType=CompanyFollowedByMember",
                "headers": {
                    "Authorization": f"Bearer {access_token}",
                },
                "key": "firstDegreeSize",
            },
        ]
        for attempt in attempts:
            try:
                res = self._make_request(attempt["url"], method="GET", headers=attempt["headers"])
                # Navigate nested key path
                val = res
                for part in attempt["key"].split("."):
                    val = val.get(part, None) if isinstance(val, dict) else None
                if isinstance(val, int) and val > 0:
                    return val
            except Exception:
                continue
        return 0

    def fetch_ugc_post_stats(self, access_token: str, person_urn: str) -> dict:
        """
        Fetch recent UGC posts and aggregate likes + comments.
        Works with the w_member_social scope that we already request.
        Returns: { post_count, total_likes, total_comments, total_shares }
        """
        try:
            encoded_urn = urllib.parse.quote(person_urn, safe="")
            url = (
                f"https://api.linkedin.com/v2/ugcPosts"
                f"?q=authors&authors=List({encoded_urn})&count=20"
                f"&projection=(elements*(likesSummary,commentsSummary,resharedPost))"
            )
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0",
            }
            res = self._make_request(url, method="GET", headers=headers)
            posts = res.get("elements", [])

            total_likes = 0
            total_comments = 0
            total_shares = 0
            for post in posts:
                total_likes    += post.get("likesSummary",   {}).get("totalLikes", 0)
                total_comments += post.get("commentsSummary",{}).get("totalFirstLevelComments", 0)
                # resharedPost presence means the post was a share itself; count it
                if post.get("resharedPost"):
                    total_shares += 1

            return {
                "post_count":    len(posts),
                "total_likes":   total_likes,
                "total_comments": total_comments,
                "total_shares":  total_shares,
            }
        except Exception:
            return {"post_count": 0, "total_likes": 0, "total_comments": 0, "total_shares": 0}

    def fetch_all_available_data(self, access_token: str, profile_id: str) -> dict:
        """
        Master method: fetches every piece of data LinkedIn exposes
        with our current OAuth scopes (openid, profile, email, w_member_social).

        Returns a unified dict ready to be stored in AudienceGrowth + CampaignPerformance.
        """
        person_urn = f"urn:li:person:{profile_id}" if not profile_id.startswith("urn:") else profile_id

        follower_count = self.fetch_follower_count(access_token, person_urn)
        post_stats     = self.fetch_ugc_post_stats(access_token, person_urn)

        return {
            "followers":      follower_count,
            "post_count":     post_stats["post_count"],
            "total_likes":    post_stats["total_likes"],
            "total_comments": post_stats["total_comments"],
            "total_shares":   post_stats["total_shares"],
            # impressions and profile_views require LinkedIn Marketing API —
            # we set them to 0 so the dashboard shows real (zero) rather than demo numbers
            "impressions":    0,
            "profile_views":  0,
        }



    def refresh_access_token_if_expired(self, account: LinkedInAccount) -> LinkedInAccount:
        """
        Silently refresh the access token if it is expired or close to expiry.
        """
        expires_at = account.expires_at
        if expires_at.tzinfo is not None:
            now = datetime.now(timezone.utc)
        else:
            now = datetime.now()

        # Check if expired or expiring in under 5 minutes
        if expires_at > now + timedelta(minutes=5):
            return account

        if not account.refresh_token:
            # If no refresh token exists, we cannot refresh. Check if we should delete or fail.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No refresh token stored. Re-authorization required."
            )

        url = "https://www.linkedin.com/oauth/v2/accessToken"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "refresh_token",
            "refresh_token": account.refresh_token,
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "client_secret": settings.LINKEDIN_CLIENT_SECRET,
        }
        
        try:
            token_data = self._make_request(url, method="POST", headers=headers, data=data)
        except HTTPException as e:
            if e.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED):
                # Clean up local stale record
                self.repository.delete(account)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="LinkedIn authorization was revoked or expired. Please reconnect your account."
                )
            raise e
            
        new_access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 3600 * 24 * 60) # Default 60 days
        new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        new_refresh_token = token_data.get("refresh_token")
        
        return self.repository.create_or_update(
            user_id=account.user_id,
            profile_id=account.profile_id,
            profile_name=account.profile_name,
            email=account.email,
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_at=new_expires_at
        )

    def disconnect_account(self, account: LinkedInAccount) -> None:
        """
        Delete local database record.
        Note: LinkedIn doesn't have a simple standard revoke endpoint like Google,
        so deleting the local record is the primary way to disconnect.
        """
        self.repository.delete(account)
