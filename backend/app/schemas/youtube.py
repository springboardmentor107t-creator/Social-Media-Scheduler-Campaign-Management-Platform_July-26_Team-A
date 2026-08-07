from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class YouTubeAccountResponse(BaseModel):
    id: UUID
    channel_id: str
    channel_name: str
    email: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class YouTubeStatusResponse(BaseModel):
    connected: bool
    accounts: List[YouTubeAccountResponse]
