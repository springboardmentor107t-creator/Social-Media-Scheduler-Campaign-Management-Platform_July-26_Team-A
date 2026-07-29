import uuid
from typing import Dict, Any
from fastapi import Depends, HTTPException, Path, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database.postgresql.connection import get_db
from database.postgresql.models import User, UserRole, Content
from app.core.config import settings
from app.infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository

# JWT OAuth2 flow
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class RBACException(Exception):
    def __init__(self, detail: str, required_role: str, your_role: str):
        self.detail = detail
        self.required_role = required_role
        self.your_role = your_role


ROLE_ORDER = {
    "user": 1,
    "manager": 2,
    "admin": 3
}


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    user_repo = SqlAlchemyUserRepository(db)
    user = user_repo.get_by_id(user_uuid)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    return user


def require_role(*allowed_roles: str):
    def checker(current_user: User = Depends(get_current_user)):
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        if user_role_str not in allowed_roles:
            raise RBACException(
                detail="Insufficient permissions",
                required_role=" or ".join(allowed_roles),
                your_role=user_role_str
            )
        return current_user
    return checker


def require_min_role(min_role: str):
    def checker(current_user: User = Depends(get_current_user)):
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        user_rank = ROLE_ORDER.get(user_role_str, 0)
        required_rank = ROLE_ORDER.get(min_role, 999)
        if user_rank < required_rank:
            raise RBACException(
                detail="Insufficient permissions",
                required_role=f"{min_role} or higher",
                your_role=user_role_str
            )
        return current_user
    return checker


def require_owner_or_role(min_role: str):
    def checker(
        id: uuid.UUID = Path(..., description="ID of the content to delete"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        content = db.query(Content).filter(Content.id == id).first()
        if not content:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

        is_owner = content.owner_id == current_user.id
        
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        user_rank = ROLE_ORDER.get(user_role_str, 0)
        required_rank = ROLE_ORDER.get(min_role, 999)
        has_role = user_rank >= required_rank

        if not (is_owner or has_role):
            raise RBACException(
                detail="Insufficient permissions",
                required_role=f"Owner or {min_role} or higher",
                your_role=user_role_str
            )
        return content
    return checker
