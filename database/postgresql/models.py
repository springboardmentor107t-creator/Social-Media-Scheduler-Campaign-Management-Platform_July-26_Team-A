import uuid
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"

class ScheduledPostStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"

class PublishingStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"

class ContentType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    CAROUSEL = "carousel"

class ContentStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"

class User(Base):
    __tablename__ = "users"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(Enum(UserRole, name="user_role", values_callable=lambda x: [e.value for e in x]), default=UserRole.USER, server_default="user", nullable=False)
    phone_number = Column(String(50), nullable=True)
    timezone = Column(String(100), default="UTC", server_default="UTC", nullable=False)
    bio = Column(String(160), nullable=True)
    avatar_url = Column(Text, nullable=True)
    pending_email = Column(String(255), nullable=True)
    notification_preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    social_accounts = relationship(
    "SocialAccount",
    back_populates="user",
    cascade="all, delete-orphan"
)

    contents = relationship(
    "Content",
    back_populates="owner",
    cascade="all, delete-orphan"
)

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    provider_account_id = Column(String(255), nullable=False, index=True)
    account_name = Column(String(255), nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_sync_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="social_accounts")
    scheduled_posts = relationship(
    "ScheduledPost",
    back_populates="social_account",
    cascade="all, delete-orphan"
)

    publishing_logs = relationship(
    "PublishingLog",
    back_populates="social_account",
    cascade="all, delete-orphan"
)

    __table_args__ = (
        UniqueConstraint("user_id", "provider", "provider_account_id", name="uq_social_account_provider"),
    )


class Content(Base):
    __tablename__ = "contents"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=True)
    media_urls = Column(JSON, nullable=True)
    content_type = Column(
        Enum(ContentType, name="content_type", values_callable=lambda x: [e.value for e in x]),
        default=ContentType.TEXT,
        server_default="text",
        nullable=False,
    )
    status = Column(
        Enum(ContentStatus, name="content_status", values_callable=lambda x: [e.value for e in x]),
        default=ContentStatus.DRAFT,
        server_default="draft",
        nullable=False,
    )
    is_approved = Column(Boolean, default=False, server_default="false", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="contents")
    scheduled_posts = relationship(
        "ScheduledPost",
        back_populates="content",
        cascade="all, delete-orphan"
    )

class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    content_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    social_account_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("social_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    parent_scheduled_post_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("scheduled_posts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    scheduled_time = Column(
        DateTime(timezone=True),
        nullable=False
    )

    is_recurring = Column(Boolean, default=False, server_default="false", nullable=False)
    recurrence_rule = Column(String(50), nullable=True)

    status = Column(
        Enum(
            ScheduledPostStatus,
            name="scheduled_post_status",
            values_callable=lambda x: [e.value for e in x]
        ),
        default=ScheduledPostStatus.PENDING,
        server_default="pending",
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    content = relationship(
        "Content",
        back_populates="scheduled_posts"
    )

    social_account = relationship(
        "SocialAccount",
        back_populates="scheduled_posts"
    )

    parent_scheduled_post = relationship(
        "ScheduledPost",
        remote_side="ScheduledPost.id",
        backref="child_scheduled_posts",
    )

    publishing_logs = relationship(
        "PublishingLog",
        back_populates="scheduled_post",
        cascade="all, delete-orphan"
    )


class PublishingLog(Base):
    __tablename__ = "publishing_logs"

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    scheduled_post_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("scheduled_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    social_account_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("social_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    status = Column(
    Enum(
        PublishingStatus,
        name="publishing_status",
        values_callable=lambda x: [e.value for e in x]
    ),
    nullable=False
)

    error_message = Column(
        Text,
        nullable=True
    )

    published_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    scheduled_post = relationship(
        "ScheduledPost",
        back_populates="publishing_logs"
    )

    social_account = relationship(
        "SocialAccount",
        back_populates="publishing_logs"
    )