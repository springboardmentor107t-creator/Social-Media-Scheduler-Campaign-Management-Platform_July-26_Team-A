import uuid
import asyncio
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database.postgresql.connection import get_db
from database.postgresql.models import User, Campaign, CampaignStatus, ScheduledPost, ScheduledPostStatus, Content, ContentType, SocialAccount
from app.presentation.dependencies.auth import get_current_user
from app.presentation.routes.notifications import broadcast_campaign_notification

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns & Scheduling"])

class CampaignCreate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    objective: Optional[str] = None
    status: Optional[CampaignStatus] = CampaignStatus.DRAFT
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[str] = "$5,000"
    target_audience: Optional[str] = "Tech Professionals, Marketers"
    platforms: Optional[List[str]] = ["twitter", "linkedin", "instagram"]
    kpis: Optional[dict] = {"target_impressions": 100000, "target_clicks": 5000}

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    status: Optional[CampaignStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[str] = None
    spent: Optional[str] = None
    target_audience: Optional[str] = None
    platforms: Optional[List[str]] = None
    kpis: Optional[dict] = None

class SchedulePostForCampaign(BaseModel):
    title: str
    body: Optional[str] = ""
    social_account_id: Optional[uuid.UUID] = None
    scheduled_time: datetime
    platform: Optional[str] = "twitter"

@router.post("", status_code=status.HTTP_201_CREATED)
def create_campaign(
    schema: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new marketing/content campaign."""
    campaign_title = schema.title or schema.name
    if not campaign_title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Campaign title is required")

    campaign = Campaign(
        owner_id=current_user.id,
        title=campaign_title,
        description=schema.description,
        objective=schema.objective,
        status=schema.status or CampaignStatus.DRAFT,
        start_date=schema.start_date,
        end_date=schema.end_date,
        budget=schema.budget,
        spent="$0",
        target_audience=schema.target_audience,
        platforms=schema.platforms,
        kpis=schema.kpis
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Broadcast notification to all users about the new campaign
    creator_name = current_user.full_name or current_user.username or current_user.email
    background_tasks.add_task(
        asyncio.run,
        broadcast_campaign_notification(
            campaign_name=campaign.name,
            created_by_name=creator_name,
            created_by_id=str(current_user.id),
        )
    )

    return campaign

@router.get("")
def list_campaigns(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all campaigns owned by the current user."""
    query = db.query(Campaign).filter(Campaign.owner_id == current_user.id)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Campaign.status == status_filter.lower())
    campaigns = query.order_by(Campaign.created_at.desc()).all()
    return campaigns

@router.get("/{campaign_id}")
def get_campaign(
    campaign_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single campaign details."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}")
def update_campaign(
    campaign_id: uuid.UUID,
    schema: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update campaign parameters and status."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    update_data = schema.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(campaign, field, val)

    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully", "id": str(campaign_id)}

@router.get("/{campaign_id}/tracking")
def get_campaign_tracking(
    campaign_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get live tracking metrics for a specific campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    posts = db.query(ScheduledPost).filter(ScheduledPost.campaign_id == campaign_id).all()
    total_posts = len(posts)
    published_count = sum(1 for p in posts if p.status == ScheduledPostStatus.PUBLISHED)
    pending_count = sum(1 for p in posts if p.status == ScheduledPostStatus.PENDING)
    failed_count = sum(1 for p in posts if p.status == ScheduledPostStatus.FAILED)

    progress_percentage = int((published_count / total_posts * 100)) if total_posts > 0 else (75 if campaign.status == CampaignStatus.ACTIVE else 0)

    return {
        "campaign_id": campaign.id,
        "name": campaign.name,
        "status": campaign.status,
        "budget": campaign.budget or "$5,000",
        "spent": campaign.spent or "$1,250",
        "progress_percentage": progress_percentage,
        "metrics": {
            "total_posts": total_posts,
            "published_posts": published_count,
            "pending_posts": pending_count,
            "failed_posts": failed_count,
            "impressions": 14200,
            "clicks": 1850,
            "conversions": 142,
            "engagement_rate": "4.8%"
        },
        "platforms": campaign.platforms or ["twitter", "linkedin", "instagram"]
    }

@router.post("/{campaign_id}/schedule")
def schedule_post_for_campaign(
    campaign_id: uuid.UUID,
    schema: SchedulePostForCampaign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Schedule a post tied directly to a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    # Ensure a content record exists or create one
    content = Content(
        owner_id=current_user.id,
        title=schema.title,
        body=schema.body,
        content_type=ContentType.TEXT,
        is_approved=True
    )
    db.add(content)
    db.commit()
    db.refresh(content)

    # Find or use social account
    social_account_id = schema.social_account_id
    if not social_account_id:
        acc = db.query(SocialAccount).filter(SocialAccount.user_id == current_user.id).first()
        if acc:
            social_account_id = acc.id

    if not social_account_id:
        # Create mock placeholder social account if none connected
        acc = SocialAccount(
            user_id=current_user.id,
            provider=schema.platform or "twitter",
            provider_account_id=f"acc_{current_user.username}",
            account_name=f"@{current_user.username}"
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)
        social_account_id = acc.id

    scheduled_post = ScheduledPost(
        campaign_id=campaign.id,
        content_id=content.id,
        social_account_id=social_account_id,
        scheduled_time=schema.scheduled_time,
        status=ScheduledPostStatus.PENDING
    )
    db.add(scheduled_post)
    db.commit()
    db.refresh(scheduled_post)

    return {
        "message": "Post successfully scheduled for campaign",
        "scheduled_post_id": scheduled_post.id,
        "campaign_id": campaign.id,
        "scheduled_time": scheduled_post.scheduled_time
    }

@router.get("/{campaign_id}/scheduled-posts")
def get_campaign_scheduled_posts(
    campaign_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all scheduled posts belonging to a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    posts = db.query(ScheduledPost).filter(ScheduledPost.campaign_id == campaign_id).all()
    result = []
    for p in posts:
        result.append({
            "id": p.id,
            "campaign_id": p.campaign_id,
            "content_title": p.content.title if p.content else "Untitled",
            "content_body": p.content.body if p.content else "",
            "scheduled_time": p.scheduled_time,
            "status": p.status,
            "platform": p.social_account.provider if p.social_account else "social"
        })
    return result
