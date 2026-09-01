from sqlalchemy.orm import Session
from app.models.facebook import FacebookAccount, FacebookPage
from uuid import UUID
from typing import List, Optional, Dict, Any
from datetime import datetime

class FacebookRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_account_by_id(self, account_id: UUID) -> Optional[FacebookAccount]:
        return self.db.query(FacebookAccount).filter(FacebookAccount.id == account_id).first()

    def get_account_by_facebook_id(self, user_id: UUID, facebook_id: str) -> Optional[FacebookAccount]:
        return self.db.query(FacebookAccount).filter(
            FacebookAccount.user_id == user_id,
            FacebookAccount.facebook_id == facebook_id
        ).first()

    def list_accounts_by_user_id(self, user_id: UUID) -> List[FacebookAccount]:
        return self.db.query(FacebookAccount).filter(FacebookAccount.user_id == user_id).all()

    def get_page_by_page_id(self, page_id: str) -> Optional[FacebookPage]:
        return self.db.query(FacebookPage).filter(FacebookPage.page_id == page_id).first()

    def create_or_update_account(
        self,
        user_id: UUID,
        facebook_id: str,
        name: str,
        email: Optional[str],
        access_token: str,
        expires_at: Optional[datetime] = None
    ) -> FacebookAccount:
        account = self.get_account_by_facebook_id(user_id, facebook_id)
        if account:
            account.name = name
            account.email = email
            account.access_token = access_token
            if expires_at:
                account.expires_at = expires_at
        else:
            account = FacebookAccount(
                user_id=user_id,
                facebook_id=facebook_id,
                name=name,
                email=email,
                access_token=access_token,
                expires_at=expires_at
            )
            self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def sync_account_pages(self, account_id: UUID, pages_data: List[Dict[str, Any]]) -> List[FacebookPage]:
        # Delete existing pages for account to re-sync
        self.db.query(FacebookPage).filter(FacebookPage.facebook_account_id == account_id).delete()
        self.db.commit()

        # If user has no pages returned from Meta Graph API, generate a default fallback page entry
        if not pages_data:
            account = self.get_account_by_id(account_id)
            if account:
                pages_data = [{
                    "page_id": account.facebook_id,
                    "page_name": f"{account.name} (Default Page)",
                    "page_access_token": account.access_token,
                    "category": "Profile Page"
                }]

        saved_pages = []
        for p in pages_data:
            page = FacebookPage(
                facebook_account_id=account_id,
                page_id=p["page_id"],
                page_name=p["page_name"],
                page_access_token=p["page_access_token"],
                category=p.get("category")
            )
            self.db.add(page)
            saved_pages.append(page)

        self.db.commit()
        for p in saved_pages:
            self.db.refresh(p)
        return saved_pages

    def delete_account(self, account: FacebookAccount) -> None:
        self.db.delete(account)
        self.db.commit()
