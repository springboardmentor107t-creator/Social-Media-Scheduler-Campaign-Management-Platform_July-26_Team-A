import uuid
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import declarative_base, relationship, synonym
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

class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

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

    campaigns = relationship(
        "Campaign",
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

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    owner_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    name = synonym("title")
    description = Column(Text, nullable=True)
    status = Column(
        Enum(CampaignStatus, name="campaign_status", values_callable=lambda x: [e.value for e in x]),
        default=CampaignStatus.DRAFT,
        server_default="draft",
        nullable=False
    )
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    budget = Column(String(50), nullable=True)
    spent = Column(String(50), nullable=True)
    target_audience = Column(String(255), nullable=True)
    platforms = Column(JSON, nullable=True)
    kpis = Column(JSON, nullable=True)
    objective = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    owner = relationship("User", back_populates="campaigns")
    scheduled_posts = relationship("ScheduledPost", back_populates="campaign", cascade="all, delete-orphan")
    campaign_contents = relationship(
        "CampaignContent",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )
    performance_rows = relationship(
        "CampaignPerformance",
        back_populates="campaign",
        cascade="all, delete-orphan"
    )
    audience_growth_rows = relationship(
        "AudienceGrowth",
        back_populates="campaign",
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

    campaign_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True
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

    campaign = relationship(
        "Campaign",
        back_populates="scheduled_posts"
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

class CampaignContent(Base):
    __tablename__ = "campaign_contents"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    campaign_id = Column(PGUUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    content_id = Column(PGUUID(as_uuid=True), ForeignKey("contents.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    campaign = relationship("Campaign", back_populates="campaign_contents")
    content = relationship("Content")

class CampaignPerformance(Base):
    __tablename__ = "campaign_performance"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    campaign_id = Column(PGUUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False)
    impressions = Column(Integer, default=0, server_default="0", nullable=False)
    reach = Column(Integer, default=0, server_default="0", nullable=False)
    clicks = Column(Integer, default=0, server_default="0", nullable=False)
    engagements = Column(Integer, default=0, server_default="0", nullable=False)
    likes = Column(Integer, default=0, server_default="0", nullable=False)
    comments = Column(Integer, default=0, server_default="0", nullable=False)
    shares = Column(Integer, default=0, server_default="0", nullable=False)
    conversions = Column(Integer, default=0, server_default="0", nullable=False)
    cost = Column(Float, default=0.0, server_default="0", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    campaign = relationship("Campaign", back_populates="performance_rows")

class ScheduledPostMetrics(Base):
    __tablename__ = "scheduled_post_metrics"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    scheduled_post_id = Column(PGUUID(as_uuid=True), ForeignKey("scheduled_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    views = Column(Integer, default=0, server_default="0", nullable=False)
    likes = Column(Integer, default=0, server_default="0", nullable=False)
    comments = Column(Integer, default=0, server_default="0", nullable=False)
    shares = Column(Integer, default=0, server_default="0", nullable=False)
    saves = Column(Integer, default=0, server_default="0", nullable=False)
    clicks = Column(Integer, default=0, server_default="0", nullable=False)
    ctr = Column(Float, default=0.0, server_default="0", nullable=False)
    engagement_rate = Column(Float, default=0.0, server_default="0", nullable=False)
    reach = Column(Integer, default=0, server_default="0", nullable=False)
    impressions = Column(Integer, default=0, server_default="0", nullable=False)

    scheduled_post = relationship("ScheduledPost")

class AudienceGrowth(Base):
    __tablename__ = "audience_growth"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    social_account_id = Column(PGUUID(as_uuid=True), ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_id = Column(PGUUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False)
    followers = Column(Integer, default=0, server_default="0", nullable=False)
    follower_change = Column(Integer, default=0, server_default="0", nullable=False)
    audience_demographics = Column(JSON, nullable=True)

    social_account = relationship("SocialAccount")
    campaign = relationship("Campaign", back_populates="audience_growth_rows")


class RoleReference(Base):
    __tablename__ = "role_reference"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    role_label = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False)
    key_responsibilities = Column(JSON, nullable=False)  # JSON list of responsibilities
    maps_to_auth_role = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
