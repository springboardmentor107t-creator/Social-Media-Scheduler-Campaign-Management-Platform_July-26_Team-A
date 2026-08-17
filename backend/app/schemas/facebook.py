from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class FacebookPageResponse(BaseModel):
    id: UUID
    page_id: str
    page_name: str
    category: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacebookAccountResponse(BaseModel):
    id: UUID
    facebook_id: str
    name: str
    email: Optional[str] = None
    created_at: datetime
    pages: List[FacebookPageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class FacebookStatusResponse(BaseModel):
    connected: bool
    accounts: List[FacebookAccountResponse]


class FacebookPostTextRequest(BaseModel):
    page_id: str
    message: str


class FacebookPostImageRequest(BaseModel):
    page_id: str
    caption: str
    image_url: str


class FacebookPostVideoRequest(BaseModel):
    page_id: str
    title: str
    description: str
    video_url: str


class FacebookPostResponse(BaseModel):
    id: str
    post_id: str
    page_id: str
    status: str
    message: str
