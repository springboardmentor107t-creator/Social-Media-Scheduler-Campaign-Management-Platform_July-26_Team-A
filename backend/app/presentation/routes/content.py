import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.postgresql.connection import get_db
from database.postgresql.models import User, Content
from app.presentation.dependencies.auth import get_current_user, require_min_role, require_owner_or_role

router = APIRouter(tags=["Content & Teams"])


class ContentCreate(BaseModel):
    title: str


@router.post("/content", status_code=status.HTTP_201_CREATED)
def create_content(
    schema: ContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = Content(
        owner_id=current_user.id,
        title=schema.title
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return {
        "id": content.id,
        "owner_id": content.owner_id,
        "title": content.title,
        "is_approved": content.is_approved
    }


@router.get("/team/{team_id}/members")
def get_team_members(
    team_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_min_role("manager"))
):
    # Return all users as workspace team members for demo purposes
    members = db.query(User).all()
    return {
        "team_id": team_id,
        "members": [
            {
                "id": m.id,
                "email": m.email,
                "role": m.role.value if hasattr(m.role, "value") else str(m.role)
            } for m in members
        ]
    }


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
    db.commit()
    db.refresh(content)
    return {
        "id": content.id,
        "title": content.title,
        "is_approved": content.is_approved
    }


@router.delete("/content/{id}")
def delete_content(
    db: Session = Depends(get_db),
    content: Content = Depends(require_owner_or_role("manager"))
):
    db.delete(content)
    db.commit()
    return {"message": "Content deleted successfully"}
