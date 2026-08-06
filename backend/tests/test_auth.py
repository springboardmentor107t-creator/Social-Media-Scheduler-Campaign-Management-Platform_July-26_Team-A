import os
import sys
import unittest
from datetime import timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add root workspace directory to sys.path to support imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from database.postgresql.models import Base, User
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.infrastructure.repositories.sqlalchemy_user_repository import SqlAlchemyUserRepository
from app.application.services.auth_service import AuthService
from app.presentation.schemas.auth import UserRegister, UserLogin

class TestAuth(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for testing
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = self.SessionLocal()
        self.user_repo = SqlAlchemyUserRepository(self.db)
        self.auth_service = AuthService(self.user_repo)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_password_hashing(self):
        password = "secret_password"
        hashed = get_password_hash(password)
        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("wrong_password", hashed))

    def test_jwt_token_flow(self):
        data = {"sub": "12345678-1234-5678-1234-567812345678", "email": "test@example.com"}
        access_token = create_access_token(data, expires_delta=timedelta(minutes=5))
        refresh_token = create_refresh_token(data, expires_delta=timedelta(days=1))

        self.assertIsNotNone(access_token)
        self.assertIsNotNone(refresh_token)

        decoded_access = decode_token(access_token)
        self.assertEqual(decoded_access.get("sub"), "12345678-1234-5678-1234-567812345678")
        self.assertEqual(decoded_access.get("email"), "test@example.com")
        self.assertEqual(decoded_access.get("type"), "access")

        decoded_refresh = decode_token(refresh_token)
        self.assertEqual(decoded_refresh.get("sub"), "12345678-1234-5678-1234-567812345678")
        self.assertEqual(decoded_refresh.get("type"), "refresh")

    def test_user_registration_and_login(self):
        # 1. Register a user
        register_schema = UserRegister(
            email="newuser@example.com",
            password="test_password_123",
            full_name="New User",
            username="newuser"
        )
        
        reg_result = self.auth_service.register(register_schema)
        self.assertIn("access_token", reg_result)
        self.assertIn("refresh_token", reg_result)
        self.assertEqual(reg_result["user"].email, "newuser@example.com")
        self.assertEqual(reg_result["user"].full_name, "New User")
        self.assertEqual(reg_result["user"].username, "newuser")

        # 2. Verify duplicate email registration fails
        with self.assertRaises(Exception) as context:
            self.auth_service.register(register_schema)
        self.assertIn("Email already exists", str(context.exception))

        # 3. Login with correct credentials
        login_schema = UserLogin(email="newuser@example.com", password="test_password_123")
        login_result = self.auth_service.login(login_schema)
        self.assertIn("access_token", login_result)
        self.assertIn("refresh_token", login_result)

        # 4. Login with invalid password fails
        bad_login_schema = UserLogin(email="newuser@example.com", password="wrongpassword")
        with self.assertRaises(Exception) as context:
            self.auth_service.login(bad_login_schema)
        self.assertIn("Invalid credentials", str(context.exception))

if __name__ == "__main__":
    unittest.main()
