"""
notifications.py — Notification CRUD routes backed by MongoDB.

Provides:
  GET   /api/notifications           — List notifications for the current user (or broadcast)
  PATCH /api/notifications/{id}/read — Mark a single notification as read
  POST  /api/notifications/read-all  — Mark all current-user notifications as read
  POST  /api/notifications           — (Internal) Create a notification (used by other services)
  POST  /api/notifications/broadcast — Broadcast a notification to ALL users
"""

import uuid as uuid_lib
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.postgresql.connection import get_db
from database.postgresql.models import User
from database.mongodb.connection import get_mongo_db
from app.presentation.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    type: str = Field(..., description="Notification type, e.g. campaign_alert, publish_success")
    message: str = Field(..., max_length=500)
    target_user_id: Optional[str] = None  # None means broadcast to all


class NotificationOut(BaseModel):
    id: str
    type: str
    message: str
    created_at: str
    read: bool
    created_by: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _create_notification(
    notif_type: str,
    message: str,
    target_user_id: Optional[str] = None,
    created_by: Optional[str] = None,
) -> dict:
    """Insert a notification document into MongoDB."""
    db = await get_mongo_db()
    doc = {
        "_id": str(uuid_lib.uuid4()),
        "type": notif_type,
        "message": message,
        "target_user_id": target_user_id,  # None = broadcast to everyone
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read_by": [],  # list of user_ids who have read this
    }
    await db.notifications.insert_one(doc)
    return doc


async def broadcast_campaign_notification(
    campaign_name: str,
    created_by_name: str,
    created_by_id: str,
) -> dict:
    """Helper called by campaigns route when a new campaign is created."""
    message = f'📣 New campaign "{campaign_name}" was created by {created_by_name}. Check it out!'
    return await _create_notification(
        notif_type="campaign_alert",
        message=message,
        target_user_id=None,  # broadcast
        created_by=created_by_id,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
async def list_notifications(
    current_user: User = Depends(get_current_user),
):
    """
    Get all notifications relevant to the current user.
    Includes: targeted to this user + broadcasts (target_user_id is None).
    Returns newest first, limited to 50.
    """
    db = await get_mongo_db()
    user_id = str(current_user.id)

    cursor = db.notifications.find({
        "$or": [
            {"target_user_id": None},        # broadcasts
            {"target_user_id": user_id},      # targeted to this user
        ]
    }).sort("created_at", -1).limit(50)

    results: List[dict] = []
    async for doc in cursor:
        results.append({
            "id": doc["_id"],
            "type": doc.get("type", "campaign_alert"),
            "message": doc.get("message", ""),
            "created_at": doc.get("created_at", ""),
            "read": user_id in doc.get("read_by", []),
            "created_by": doc.get("created_by"),
        })

    return results


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read for the current user."""
    db = await get_mongo_db()
    user_id = str(current_user.id)

    result = await db.notifications.update_one(
        {"_id": notification_id},
        {"$addToSet": {"read_by": user_id}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    db = await get_mongo_db()
    user_id = str(current_user.id)

    await db.notifications.update_many(
        {
            "$or": [
                {"target_user_id": None},
                {"target_user_id": user_id},
            ]
        },
        {"$addToSet": {"read_by": user_id}},
    )

    return {"message": "All notifications marked as read"}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_notification(
    schema: NotificationCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a notification (targeted or broadcast)."""
    doc = await _create_notification(
        notif_type=schema.type,
        message=schema.message,
        target_user_id=schema.target_user_id,
        created_by=str(current_user.id),
    )
    return {
        "id": doc["_id"],
        "type": doc["type"],
        "message": doc["message"],
        "created_at": doc["created_at"],
    }
