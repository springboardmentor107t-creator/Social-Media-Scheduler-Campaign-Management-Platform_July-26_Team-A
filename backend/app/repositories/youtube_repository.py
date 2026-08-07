from sqlalchemy.orm import Session
from app.models.youtube import YouTubeAccount
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class YouTubeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, account_id: UUID) -> Optional[YouTubeAccount]:
        return self.db.query(YouTubeAccount).filter(YouTubeAccount.id == account_id).first()

    def get_by_channel_id(self, user_id: UUID, channel_id: str) -> Optional[YouTubeAccount]:
        return self.db.query(YouTubeAccount).filter(
            YouTubeAccount.user_id == user_id,
            YouTubeAccount.channel_id == channel_id
        ).first()

    def list_by_user_id(self, user_id: UUID) -> List[YouTubeAccount]:
        return self.db.query(YouTubeAccount).filter(YouTubeAccount.user_id == user_id).all()

    def create_or_update(
        self,
        user_id: UUID,
        channel_id: str,
        channel_name: str,
        email: Optional[str],
        access_token: str,
        refresh_token: Optional[str],
        expires_at: datetime
    ) -> YouTubeAccount:
        account = self.get_by_channel_id(user_id, channel_id)
        if account:
            account.channel_name = channel_name
            account.email = email
            account.access_token = access_token
            if refresh_token:
                account.refresh_token = refresh_token
            account.expires_at = expires_at
        else:
            account = YouTubeAccount(
                user_id=user_id,
                channel_id=channel_id,
                channel_name=channel_name,
                email=email,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at
            )
            self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def delete(self, account: YouTubeAccount) -> None:
        self.db.delete(account)
        self.db.commit()
