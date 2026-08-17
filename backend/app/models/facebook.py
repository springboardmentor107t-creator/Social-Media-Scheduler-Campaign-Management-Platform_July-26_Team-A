import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.postgresql.models import Base

class FacebookAccount(Base):
    __tablename__ = "facebook_accounts"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    facebook_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="facebook_accounts")
    pages = relationship("FacebookPage", back_populates="account", cascade="all, delete-orphan")


class FacebookPage(Base):
    __tablename__ = "facebook_pages"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    facebook_account_id = Column(PGUUID(as_uuid=True), ForeignKey("facebook_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    page_id = Column(String(255), nullable=False, index=True)
    page_name = Column(String(255), nullable=False)
    page_access_token = Column(Text, nullable=False)
    category = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    account = relationship("FacebookAccount", back_populates="pages")
