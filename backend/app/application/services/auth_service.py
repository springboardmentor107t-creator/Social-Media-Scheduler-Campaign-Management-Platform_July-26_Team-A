from typing import Dict, Any
from fastapi import HTTPException, status
from database.postgresql.models import User, UserRole
from app.domain.repositories.user_repository import UserRepository
from app.presentation.schemas.auth import UserRegister, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def register(self, schema: UserRegister) -> Dict[str, Any]:
        """Register a new user, checking for email/username duplicates."""
        # 1. Prevent duplicate email registration
        if self.user_repo.get_by_email(schema.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )

        # 2. Prevent duplicate username registration, or auto-generate if missing
        username = schema.username
        if not username:
            base_username = schema.email.split("@")[0]
            # Strip special characters that aren't letters/numbers or underscore/dash
            base_username = "".join(c for c in base_username if c.isalnum() or c in ("_", "-"))[:90]
            if not base_username:
                base_username = "user"
            username = base_username
            counter = 1
            while self.user_repo.get_by_username(username):
                username = f"{base_username}_{counter}"
                counter += 1
        else:
            if self.user_repo.get_by_username(username):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )

        # 3. Create user
        password_hash = get_password_hash(schema.password)
        new_user = User(
            email=schema.email,
            username=username,
            full_name=schema.full_name,
            password_hash=password_hash,
            role=schema.role or UserRole.USER,
            is_active=True
        )
        saved_user = self.user_repo.create(new_user)

        # 4. Generate Access and Refresh Tokens
        role_val = saved_user.role.value if hasattr(saved_user.role, "value") else str(saved_user.role)
        token_data = {
            "sub": str(saved_user.id),
            "email": saved_user.email,
            "role": role_val
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": saved_user
        }

    def login(self, schema: UserLogin) -> Dict[str, Any]:
        """Authenticate user, verifying credentials, and returning tokens."""
        user = self.user_repo.get_by_email(schema.email)
        if not user or not verify_password(schema.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )

        # Generate fresh tokens
        role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": role_val
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        }
