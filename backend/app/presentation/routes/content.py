import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.postgresql.connection import get_db
from database.postgresql.models import (
    Content,
    ContentStatus,
    ContentType,
    ScheduledPost,
    ScheduledPostStatus,
    SocialAccount,
    User,
    UserRole,
)
from app.presentation.dependencies.auth import get_current_user, require_min_role, require_owner_or_role

router = APIRouter(tags=["Content & Scheduling"])


@router.get("/social-accounts")
def get_social_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    accounts = db.query(SocialAccount).filter(
        SocialAccount.user_id == current_user.id,
        SocialAccount.is_active == True
    ).all()
    
    return [
        {
            "id": str(sa.id),
            "provider": sa.provider,
            "account_name": sa.account_name or sa.provider_account_id,
            "is_active": sa.is_active
        }
        for sa in accounts
    ]


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class ContentCreate(BaseModel):
    title: str = Field(..., max_length=255)
    body: Optional[str] = None
    content_type: ContentType = ContentType.TEXT
    media_urls: Optional[List[str]] = None
    status: ContentStatus = ContentStatus.DRAFT


class ContentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    body: Optional[str] = None
    content_type: Optional[ContentType] = None
    media_urls: Optional[List[str]] = None
    status: Optional[ContentStatus] = None


class ScheduledPostCreate(BaseModel):
    content_id: uuid.UUID
    social_account_ids: List[uuid.UUID]
    scheduled_time: datetime
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    publish_now: bool = False


class ScheduledPostUpdate(BaseModel):
    scheduled_time: Optional[datetime] = None
    status: Optional[ScheduledPostStatus] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_content(content: Content, db: Session) -> dict:
    scheduled_posts = (
        db.query(ScheduledPost)
        .filter(ScheduledPost.content_id == content.id)
        .all()
    )

    scheduled_list = []
    providers = set()
    latest_scheduled_time = None
    primary_status = content.status.value if hasattr(content.status, "value") else str(content.status)

    for sp in scheduled_posts:
        account = db.query(SocialAccount).filter(SocialAccount.id == sp.social_account_id).first()
        prov_name = account.provider.capitalize() if account else "Social"
        providers.add(prov_name)
        if latest_scheduled_time is None or sp.scheduled_time > latest_scheduled_time:
            latest_scheduled_time = sp.scheduled_time

        sp_status_val = sp.status.value if hasattr(sp.status, "value") else str(sp.status)
        scheduled_list.append({
            "id": str(sp.id),
            "social_account_id": str(sp.social_account_id),
            "provider": prov_name,
            "scheduled_time": sp.scheduled_time.isoformat() if sp.scheduled_time else None,
            "status": sp_status_val,
            "is_recurring": sp.is_recurring,
            "recurrence_rule": sp.recurrence_rule,
        })

    # Derive overall status for UI display
    display_status = "Draft"
    if content.status == ContentStatus.DRAFT:
        display_status = "Draft"
    elif any(sp["status"] == "published" for sp in scheduled_list):
        display_status = "Published"
    elif any(sp["status"] == "failed" for sp in scheduled_list):
        display_status = "Failed"
    elif any(sp["status"] in ("pending", "processing") for sp in scheduled_list):
        display_status = "Scheduled"
    elif content.status == ContentStatus.PENDING_APPROVAL:
        display_status = "Pending Approval"
    elif content.status == ContentStatus.APPROVED:
        display_status = "Approved"

    platform_str = ", ".join(sorted(providers)) if providers else "Unassigned"
    scheduled_str = latest_scheduled_time.strftime("%b %d, %I:%M %p") if latest_scheduled_time else "—"

    return {
        "id": str(content.id),
        "owner_id": str(content.owner_id),
        "title": content.title,
        "body": content.body,
        "content_type": content.content_type.value if hasattr(content.content_type, "value") else str(content.content_type),
        "media_urls": content.media_urls or [],
        "status": primary_status,
        "display_status": display_status,
        "platform": platform_str,
        "scheduledTime": scheduled_str,
        "raw_scheduled_time": latest_scheduled_time.isoformat() if latest_scheduled_time else None,
        "is_approved": content.is_approved,
        "created_at": content.created_at.isoformat() if content.created_at else None,
        "scheduled_posts": scheduled_list,
    }


# ── Content Routes ───────────────────────────────────────────────────────────

@router.post("/content", status_code=status.HTTP_201_CREATED)
def create_content(
    schema: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = Content(
        owner_id=current_user.id,
        title=schema.title,
        body=schema.body,
        content_type=schema.content_type,
        media_urls=schema.media_urls or [],
        status=schema.status,
        is_approved=(current_user.role in (UserRole.ADMIN, UserRole.MANAGER))
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return _serialize_content(content, db)


@router.get("/content")
def list_contents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Content)
    
    # Manager & Admin can view all workspace contents; regular User views their own
    user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role_val not in ("admin", "manager"):
        query = query.filter(Content.owner_id == current_user.id)

    if status_filter:
        try:
            target_enum = ContentStatus(status_filter.lower())
            query = query.filter(Content.status == target_enum)
        except ValueError:
            pass

    total = query.count()
    contents = query.order_by(Content.created_at.desc()).offset(skip).limit(limit).all()

    items = [_serialize_content(c, db) for c in contents]
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }


@router.get("/content/{id}")
def get_content(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = db.query(Content).filter(Content.id == id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if content.owner_id != current_user.id and user_role_val not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this content")

    return _serialize_content(content, db)


@router.patch("/content/{id}")
def update_content(
    id: uuid.UUID,
    schema: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = db.query(Content).filter(Content.id == id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if content.owner_id != current_user.id and user_role_val not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this content")

    # Reject edit if content is already scheduled or published
    active_scheduled = db.query(ScheduledPost).filter(
        ScheduledPost.content_id == id,
        ScheduledPost.status.in_([ScheduledPostStatus.PROCESSING, ScheduledPostStatus.PUBLISHED])
    ).first()

    if active_scheduled or content.status == ContentStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Content is already scheduled or published and cannot be modified."
        )

    if schema.title is not None:
        content.title = schema.title
    if schema.body is not None:
        content.body = schema.body
    if schema.content_type is not None:
        content.content_type = schema.content_type
    if schema.media_urls is not None:
        content.media_urls = schema.media_urls
    if schema.status is not None:
        content.status = schema.status

    db.commit()
    db.refresh(content)
    return _serialize_content(content, db)


@router.post("/content/{id}/duplicate", status_code=status.HTTP_201_CREATED)
def duplicate_content(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source = db.query(Content).filter(Content.id == id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source content not found")

    duplicated = Content(
        owner_id=current_user.id,
        title=f"Copy of {source.title}",
        body=source.body,
        content_type=source.content_type,
        media_urls=source.media_urls or [],
        status=ContentStatus.DRAFT,
        is_approved=False
    )
    db.add(duplicated)
    db.commit()
    db.refresh(duplicated)
    return _serialize_content(duplicated, db)


@router.delete("/content/{id}")
def delete_content(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = db.query(Content).filter(Content.id == id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if content.owner_id != current_user.id and user_role_val not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this content")

    db.delete(content)
    db.commit()
    return {"message": "Content deleted successfully"}


@router.post("/content/{id}/approve")
def approve_content(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_min_role("manager"))
):
    content = db.query(Content).filter(Content.id == id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    
    content.is_approved = True
    content.status = ContentStatus.APPROVED
    db.commit()
    db.refresh(content)
    return _serialize_content(content, db)


# ── Scheduled Posts Routes ────────────────────────────────────────────────────

@router.post("/scheduled-posts", status_code=status.HTTP_201_CREATED)
def schedule_posts(
    schema: ScheduledPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = db.query(Content).filter(Content.id == schema.content_id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found")

    user_role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if content.owner_id != current_user.id and user_role_val not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to schedule this content")

    now_utc = datetime.now(timezone.utc)
    target_time = schema.scheduled_time
    if target_time.tzinfo is None:
        target_time = target_time.replace(tzinfo=timezone.utc)

    if not schema.publish_now and target_time <= now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time must be in the future."
        )

    if not schema.social_account_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one social account must be selected for scheduling."
        )

    created_sp_list = []
    initial_status = ScheduledPostStatus.PUBLISHED if schema.publish_now else ScheduledPostStatus.PENDING

    for sa_id in schema.social_account_ids:
        sa = db.query(SocialAccount).filter(SocialAccount.id == sa_id).first()
        if not sa or not sa.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Active social account {sa_id} not found"
            )

        sp = ScheduledPost(
            content_id=content.id,
            social_account_id=sa.id,
            scheduled_time=target_time if not schema.publish_now else now_utc,
            is_recurring=schema.is_recurring,
            recurrence_rule=schema.recurrence_rule if schema.is_recurring else None,
            status=initial_status,
        )
        db.add(sp)
        created_sp_list.append(sp)

    # Update content status
    if user_role_val in ("admin", "manager"):
        content.status = ContentStatus.APPROVED
        content.is_approved = True
    else:
        content.status = ContentStatus.PENDING_APPROVAL

    db.commit()

    return {
        "message": f"Successfully scheduled {len(created_sp_list)} post(s)",
        "scheduled_posts": [
            {
                "id": str(sp.id),
                "content_id": str(sp.content_id),
                "social_account_id": str(sp.social_account_id),
                "scheduled_time": sp.scheduled_time.isoformat(),
                "status": sp.status.value if hasattr(sp.status, "value") else str(sp.status),
                "is_recurring": sp.is_recurring,
                "recurrence_rule": sp.recurrence_rule
            }
            for sp in created_sp_list
        ]
    }


@router.patch("/scheduled-posts/{id}")
def update_scheduled_post(
    id: uuid.UUID,
    schema: ScheduledPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sp = db.query(ScheduledPost).filter(ScheduledPost.id == id).first()
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled post not found")

    if sp.status != ScheduledPostStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending scheduled posts can be rescheduled or cancelled."
        )

    if schema.scheduled_time is not None:
        target_time = schema.scheduled_time
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)
        if target_time <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be in the future."
            )
        sp.scheduled_time = target_time

    if schema.status is not None:
        sp.status = schema.status

    db.commit()
    db.refresh(sp)

    return {
        "id": str(sp.id),
        "scheduled_time": sp.scheduled_time.isoformat(),
        "status": sp.status.value if hasattr(sp.status, "value") else str(sp.status)
    }


@router.get("/team/{team_id}/members")
def get_team_members(
    team_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_min_role("manager"))
):
    members = db.query(User).all()
    return {
        "team_id": team_id,
        "members": [
            {
                "id": str(m.id),
                "email": m.email,
                "role": m.role.value if hasattr(m.role, "value") else str(m.role)
            } for m in members
        ]
    }
