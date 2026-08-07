import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database.postgresql.connection import get_db
from database.postgresql.models import User, UserRole
from app.presentation.dependencies.auth import get_current_user, require_min_role, require_role
from app.presentation.schemas.auth import (
    UserResponse,
    UserProfileResponse,
    UserProfileUpdate,
    EmailChangeRequest,
    ChangePasswordRequest,
    DeactivateAccountRequest,
    AccountSettingsUpdate
)
from app.core.security import verify_password, get_password_hash
from app.core.config import settings

router = APIRouter(tags=["Users"])

def send_verification_email(user: User, token: str):
    print(f"[STUB EMAIL] Verification email for {user.email} (new: {user.pending_email}). Token: {token}")

@router.get("/users/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/users/me", response_model=UserProfileResponse)
def update_profile(
    schema: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = schema.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(current_user, key, val)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.patch("/users/me/email")
def change_email(
    schema: EmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_email = schema.new_email
    if db.query(User).filter(User.email == new_email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use"
        )
    current_user.pending_email = new_email
    db.commit()
    db.refresh(current_user)

    token_data = {
        "sub": str(current_user.id),
        "new_email": new_email,
        "type": "email_verify",
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    send_verification_email(current_user, token)
    return {"message": "Verification email sent. Please check console logs."}

@router.get("/users/me/email/verify")
def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "email_verify":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token type")
        user_id = payload.get("sub")
        new_email = payload.get("new_email")
        if not user_id or not new_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.pending_email != new_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token email does not match pending email")

    if db.query(User).filter(User.email == new_email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use"
        )

    user.email = new_email
    user.pending_email = None
    db.commit()
    db.refresh(user)
    return {"message": "Email successfully updated", "email": user.email}

@router.post("/users/me/change-password")
def change_password(
    schema: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Note: Since JWTs aren't invalidated on password change in this implementation,
    # existing sessions on other devices remain valid until token expiry.
    if not verify_password(schema.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    current_user.password_hash = get_password_hash(schema.new_password)
    db.commit()
    db.refresh(current_user)
    return {"message": "Password successfully updated"}

@router.patch("/users/me/account", response_model=UserProfileResponse)
def update_account_settings(
    schema: AccountSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = schema.model_dump(exclude_unset=True)
    # Note: notification_preferences is not yet wired to actual notification sending
    for key, val in update_data.items():
        setattr(current_user, key, val)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/users/me/deactivate")
def deactivate_account(
    schema: DeactivateAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(schema.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password confirmation"
        )

    current_user.is_active = False
    db.commit()
    db.refresh(current_user)
    return {"message": "Account successfully deactivated"}


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin"))
):
    return db.query(User).all()

@router.patch("/users/{id}/role", response_model=UserResponse)
def update_user_role(
    id: uuid.UUID,
    role: UserRole,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("admin"))
):
    # Rule 1: must not allow a user to change their own role
    if admin.id == id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Users cannot change their own roles"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Rule 2: must not allow removing the last remaining Admin
    current_role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    if current_role_str == "admin" and role != UserRole.ADMIN:
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last remaining active Administrator"
            )
            
    user.role = role
    db.commit()
    db.refresh(user)
    return user

@router.get("/admin/settings")
def get_admin_settings(admin: User = Depends(require_role("admin"))):
    return {"message": "Welcome to the Admin Settings Panel"}


FALLBACK_ROLES = {
    "Content Creator": {
        "description": "Individual users who create, manage, and publish content across connected social media platforms.",
        "key_responsibilities": [
            "Create and edit social media posts",
            "Save and manage draft content",
            "Schedule posts for future publishing",
            "Create recurring posts for regular campaigns",
            "Upload and manage media assets",
            "Track post performance and engagement metrics",
            "View publishing history and status logs",
            "Manage connected social media accounts",
            "Monitor scheduled and published content",
            "Access personal analytics and reports"
        ],
        "maps_to_auth_role": "user"
    },
    "Marketing Team": {
        "description": "Team members collaborating on marketing campaigns and social media management.",
        "key_responsibilities": [
            "Collaborate on campaign planning and execution",
            "Create and manage campaign content",
            "Review and approve scheduled posts",
            "Coordinate publishing across multiple channels",
            "Manage campaign calendars and timelines",
            "Track campaign performance metrics",
            "Monitor audience engagement and trends",
            "Manage shared content drafts",
            "Generate campaign reports",
            "Collaborate with content creators and business users"
        ],
        "maps_to_auth_role": "manager"
    },
    "Business User": {
        "description": "Organizations and businesses managing multiple brands, teams, and social media accounts.",
        "key_responsibilities": [
            "Manage multiple social media accounts",
            "Oversee brand campaigns and marketing strategies",
            "Manage team members and permissions",
            "Access business analytics dashboards",
            "Monitor publishing activities across accounts",
            "Review campaign performance reports",
            "Manage social media integrations",
            "Approve content before publishing",
            "Track ROI and engagement metrics",
            "Ensure brand consistency across platforms"
        ],
        "maps_to_auth_role": "manager"
    },
    "Administrator": {
        "description": "Platform administrators responsible for system management, security, and monitoring.",
        "key_responsibilities": [
            "Manage users and role assignments",
            "Configure system settings and platform preferences",
            "Monitor platform health and performance",
            "Manage security policies and access control",
            "Review system activity logs",
            "Monitor publishing queues and background services",
            "Generate platform-wide reports",
            "Handle user support and issue resolution",
            "Manage social media API configurations",
            "Ensure compliance, security, and data integrity"
        ],
        "maps_to_auth_role": "admin"
    }
}


@router.get("/api/roles/{role_label}")
def get_role_reference(role_label: str, db: Session = Depends(get_db)):
    from database.postgresql.models import RoleReference
    role_ref = db.query(RoleReference).filter(RoleReference.role_label == role_label).first()
    if role_ref:
        return {
            "id": str(role_ref.id),
            "role_label": role_ref.role_label,
            "description": role_ref.description,
            "key_responsibilities": role_ref.key_responsibilities,
            "maps_to_auth_role": role_ref.maps_to_auth_role
        }
    
    # Fallback to local definitions if seed is missing
    if role_label in FALLBACK_ROLES:
        fallback = FALLBACK_ROLES[role_label]
        return {
            "id": None,
            "role_label": role_label,
            "description": fallback["description"],
            "key_responsibilities": fallback["key_responsibilities"],
            "maps_to_auth_role": fallback["maps_to_auth_role"]
        }
        
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Role reference for '{role_label}' not found"
    )

