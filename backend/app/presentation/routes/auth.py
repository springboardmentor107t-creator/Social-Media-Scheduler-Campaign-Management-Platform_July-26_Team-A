import uuid as uuid_lib
from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database.postgresql.connection import get_db
from database.postgresql.models import User
from app.presentation.schemas.auth import UserRegister, UserLogin, TokenResponse, RefreshTokenRequest
from app.infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository
from app.application.services.auth_service import AuthService
from app.core.security import decode_token, create_access_token, create_refresh_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Dependency provider for AuthService."""
    user_repo = SqlAlchemyUserRepository(db)
    return AuthService(user_repo)

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(schema: UserRegister, auth_service: AuthService = Depends(get_auth_service)):
    """
    Register a new user account.
    Validates full name, email, and password.
    Prevents duplicate email registration.
    """
    return auth_service.register(schema)

@router.post("/login", response_model=TokenResponse)
def login(schema: UserLogin, auth_service: AuthService = Depends(get_auth_service)):
    """
    Authenticate using email and password JSON payload.
    """
    return auth_service.login(schema)

@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def login_oauth2_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Form-based login compatible with OAuth2 specification (Swagger UI authorization).
    Maps the form 'username' field to the user's email.
    """
    schema = UserLogin(email=form_data.username, password=form_data.password)
    return auth_service.login(schema)


@router.post("/refresh")
def refresh_tokens(schema: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Exchange a valid refresh token for a new access + refresh token pair (rotation).
    Returns 401 if the token is expired, invalid, or the account is deactivated.
    """
    payload = decode_token(schema.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token")

    try:
        user_id = uuid_lib.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token")

    user: User = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token_data = {"sub": str(user.id), "email": user.email, "role": role_val}

    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user,
    }
