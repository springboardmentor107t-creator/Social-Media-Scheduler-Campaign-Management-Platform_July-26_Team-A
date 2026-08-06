import re
import zoneinfo
from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
from database.postgresql.models import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters.")
    full_name: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = Field(UserRole.USER, description="User role in the system")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    full_name: Optional[str]
    is_active: bool
    role: UserRole
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserProfileResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str]
    phone_number: Optional[str]
    timezone: str
    bio: Optional[str]
    avatar_url: Optional[str]
    role: UserRole
    is_active: bool
    notification_preferences: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None)
    timezone: Optional[str] = Field(None)
    bio: Optional[str] = Field(None, max_length=160, description="Bio must not exceed 160 characters.")
    avatar_url: Optional[str] = Field(None)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if v not in zoneinfo.available_timezones():
                raise ValueError("Invalid IANA timezone string")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            pattern = re.compile(r"^\+?[0-9\s\-()]{7,20}$")
            if not pattern.match(v):
                raise ValueError("Invalid phone number format")
        return v


class EmailChangeRequest(BaseModel):
    new_email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, description="Password must be at least 8 characters.")

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one number")
        return v


class DeactivateAccountRequest(BaseModel):
    password: str


class AccountSettingsUpdate(BaseModel):
    timezone: Optional[str] = Field(None)
    notification_preferences: Optional[Dict[str, Any]] = Field(None)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if v not in zoneinfo.available_timezones():
                raise ValueError("Invalid IANA timezone string")
        return v
