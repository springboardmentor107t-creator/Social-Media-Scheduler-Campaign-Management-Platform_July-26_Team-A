import urllib.parse
import requests
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.facebook import FacebookAccount, FacebookPage
from app.repositories.facebook_repository import FacebookRepository

class FacebookService:
    def __init__(self, repository: FacebookRepository):
        self.repository = repository

    def get_auth_url(self, state: str) -> str:
        """
        Build Facebook OAuth Authorization URL with required scopes.
        Scopes: pages_show_list, pages_manage_posts, pages_read_engagement, public_profile, email
        """
        base_url = f"https://www.facebook.com/{settings.FACEBOOK_API_VERSION}/dialog/oauth"
        scopes = [
            "pages_show_list",
            "pages_manage_posts",
            "pages_read_engagement",
            "public_profile",
            "email"
        ]
        params = {
            "client_id": settings.FACEBOOK_APP_ID,
            "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
            "state": state,
            "scope": ",".join(scopes),
            "response_type": "code"
        }
        return f"{base_url}?{urllib.parse.urlencode(params)}"

    def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for a User Access Token via Graph API.
        """
        url = f"https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/oauth/access_token"
        params = {
            "client_id": settings.FACEBOOK_APP_ID,
            "client_secret": settings.FACEBOOK_APP_SECRET,
            "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
            "code": code
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()
            if response.status_code != 200 or "error" in data:
                error_msg = data.get("error", {}).get("message", response.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Facebook OAuth exchange failed: {error_msg}"
                )
            return data
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error communicating with Facebook API: {str(e)}"
            )

    def fetch_user_profile(self, user_access_token: str) -> dict:
        """
        Fetch Facebook user profile (ID, name, email) from /me endpoint.
        """
        url = f"https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/me"
        params = {
            "fields": "id,name,email",
            "access_token": user_access_token
        }
        try:
            res = requests.get(url, params=params, timeout=10)
            data = res.json()
            if res.status_code != 200 or "error" in data:
                err = data.get("error", {}).get("message", res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch Facebook user profile: {err}"
                )
            return {
                "facebook_id": data.get("id"),
                "name": data.get("name", "Facebook User"),
                "email": data.get("email")
            }
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error fetching Facebook profile: {str(e)}"
            )

    def fetch_user_pages(self, user_access_token: str) -> List[dict]:
        """
        Fetch all Facebook Pages managed by user from /me/accounts endpoint.
        Includes Page ID, Page Name, Page Access Token, Category.
        """
        url = f"https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/me/accounts"
        params = {
            "fields": "id,name,access_token,category",
            "access_token": user_access_token
        }
        try:
            res = requests.get(url, params=params, timeout=10)
            data = res.json()
            if res.status_code != 200 or "error" in data:
                err = data.get("error", {}).get("message", res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch Facebook pages: {err}"
                )
            
            pages_list = []
            for item in data.get("data", []):
                pages_list.append({
                    "page_id": item.get("id"),
                    "page_name": item.get("name"),
                    "page_access_token": item.get("access_token"),
                    "category": item.get("category")
                })
            return pages_list
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error fetching Facebook pages: {str(e)}"
            )

    def post_text(self, page_id: str, page_access_token: str, message: str) -> dict:
        """
        Publish a text post to Facebook Page feed using stored Page Access Token.
        """
        url = f"https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/{page_id}/feed"
        data = {
            "message": message,
            "access_token": page_access_token
        }
        try:
            res = requests.post(url, data=data, timeout=15)
            res_json = res.json()
            if res.status_code != 200 or "error" in res_json:
                err = res_json.get("error", {}).get("message", res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Facebook text post failed: {err}"
                )
            return {
                "id": res_json.get("id", ""),
                "post_id": res_json.get("id", ""),
                "page_id": page_id,
                "status": "published",
                "message": "Text post published successfully to Facebook Page"
            }
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error publishing text to Facebook: {str(e)}"
            )

    def post_image(self, page_id: str, page_access_token: str, caption: str, image_url: str) -> dict:
        """
        Publish an image post to Facebook Page photos using stored Page Access Token.
        """
        url = f"https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/{page_id}/photos"
        data = {
            "url": image_url,
            "caption": caption,
            "access_token": page_access_token
        }
        try:
            res = requests.post(url, data=data, timeout=20)
            res_json = res.json()
            if res.status_code != 200 or "error" in res_json:
                err = res_json.get("error", {}).get("message", res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Facebook photo post failed: {err}"
                )
            return {
                "id": res_json.get("id", ""),
                "post_id": res_json.get("post_id", res_json.get("id", "")),
                "page_id": page_id,
                "status": "published",
                "message": "Image post published successfully to Facebook Page"
            }
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error publishing image to Facebook: {str(e)}"
            )

    def post_video(self, page_id: str, page_access_token: str, title: str, description: str, video_url: str) -> dict:
        """
        Publish a video post to Facebook Page videos using stored Page Access Token.
        """
        url = f"https://graph.facebook.com/{settings.FACEBOOK_API_VERSION}/{page_id}/videos"
        data = {
            "file_url": video_url,
            "title": title,
            "description": description,
            "access_token": page_access_token
        }
        try:
            res = requests.post(url, data=data, timeout=30)
            res_json = res.json()
            if res.status_code != 200 or "error" in res_json:
                err = res_json.get("error", {}).get("message", res.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Facebook video post failed: {err}"
                )
            return {
                "id": res_json.get("id", ""),
                "post_id": res_json.get("id", ""),
                "page_id": page_id,
                "status": "published",
                "message": "Video post published successfully to Facebook Page"
            }
        except requests.RequestException as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Network error publishing video to Facebook: {str(e)}"
            )
