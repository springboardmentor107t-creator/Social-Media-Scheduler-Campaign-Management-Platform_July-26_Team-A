from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class LinkedInAccountResponse(BaseModel):
    id: UUID
    profile_id: str
    profile_name: str
    email: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LinkedInStatusResponse(BaseModel):
    connected: bool
    accounts: List[LinkedInAccountResponse]
