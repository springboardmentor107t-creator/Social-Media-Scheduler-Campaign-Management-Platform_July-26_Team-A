from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from database.postgresql.models import User

class UserRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        """Retrieve a user by their email address."""
        pass

    @abstractmethod
    def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Retrieve a user by their unique identifier."""
        pass

    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        """Retrieve a user by their username."""
        pass

    @abstractmethod
    def create(self, user: User) -> User:
        """Create a new user record in the database."""
        pass
