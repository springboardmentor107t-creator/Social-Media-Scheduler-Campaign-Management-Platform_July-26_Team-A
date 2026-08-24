import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://socialpilot_user:socialpilot_password@127.0.0.1:5432/socialpilot_db"
    )
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb://admin:admin_password@localhost:27017/socialpilot_db?authSource=admin"
    )

    # Connection pool settings (tuned for typical student-deployment concurrency)
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))

    # ── Security ─────────────────────────────────────────────────────────────
    # SECRET_KEY must be set via environment variable — no hardcoded default in production.
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE-ME-generate-a-real-256-bit-hex-secret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── Environment ──────────────────────────────────────────────────────────
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    # Comma-separated list of allowed CORS origins for production.
    # Example: "https://socialpilot.vercel.app,https://www.socialpilot.app"
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://localhost:3000"
    )

    # ── YouTube OAuth ─────────────────────────────────────────────────────────
    YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "")
    YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")
    YOUTUBE_REDIRECT_URI: str = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:8000/auth/youtube/callback")

    # ── Facebook OAuth ────────────────────────────────────────────────────────
    FACEBOOK_APP_ID: str = os.getenv("FACEBOOK_APP_ID", "")
    FACEBOOK_APP_SECRET: str = os.getenv("FACEBOOK_APP_SECRET", "")
    FACEBOOK_REDIRECT_URI: str = os.getenv("FACEBOOK_REDIRECT_URI", "http://localhost:8000/auth/facebook/callback")
    FACEBOOK_API_VERSION: str = os.getenv("FACEBOOK_API_VERSION", "v23.0")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
