from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database.postgresql.connection import get_db
from database.postgresql.models import User
from app.core.security import decode_token
from app.infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository

# Token endpoint URL matching standard FastAPI logins
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_user_repository(db: Session = Depends(get_db)) -> SqlAlchemyUserRepository:
    """Dependency provider for SqlAlchemyUserRepository."""
    return SqlAlchemyUserRepository(db)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository)
) -> User:
    """Validate JWT token and return current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    user_id_str = payload.get("sub")
    token_type = payload.get("type")
    
    # Ensure it's an access token (not refresh token) and has sub
    if not user_id_str or token_type != "access":
        raise credentials_exception
        
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception
        
    user = user_repo.get_by_id(user_id)
    if user is None:
        raise credentials_exception
        
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the authenticated user account is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user
