from sqlalchemy.orm import Session
from app.models.linkedin import LinkedInAccount
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class LinkedInRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, account_id: UUID) -> Optional[LinkedInAccount]:
        return self.db.query(LinkedInAccount).filter(LinkedInAccount.id == account_id).first()

    def get_by_profile_id(self, user_id: UUID, profile_id: str) -> Optional[LinkedInAccount]:
        return self.db.query(LinkedInAccount).filter(
            LinkedInAccount.user_id == user_id,
            LinkedInAccount.profile_id == profile_id
        ).first()

    def list_by_user_id(self, user_id: UUID) -> List[LinkedInAccount]:
        return self.db.query(LinkedInAccount).filter(LinkedInAccount.user_id == user_id).all()

    def create_or_update(
        self,
        user_id: UUID,
        profile_id: str,
        profile_name: str,
        email: Optional[str],
        access_token: str,
        refresh_token: Optional[str],
        expires_at: datetime
    ) -> LinkedInAccount:
        account = self.get_by_profile_id(user_id, profile_id)
        if account:
            account.profile_name = profile_name
            account.email = email
            account.access_token = access_token
            if refresh_token:
                account.refresh_token = refresh_token
            account.expires_at = expires_at
        else:
            account = LinkedInAccount(
                user_id=user_id,
                profile_id=profile_id,
                profile_name=profile_name,
                email=email,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at
            )
            self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def delete(self, account: LinkedInAccount) -> None:
        self.db.delete(account)
        self.db.commit()
