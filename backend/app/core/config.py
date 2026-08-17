import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://socialpilot_user:socialpilot_password@127.0.0.1:5432/socialpilot_db")
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://admin:admin_password@localhost:27017/socialpilot_db?authSource=admin")
    SECRET_KEY: str = "949f2b86121406e9389da6d54203df88f1dc3ffad2dc7d9d0c262ad1bc7a8f3b"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "673660570173-mfnffmfahb74p38b7abq1v5k12q3kdm4.apps.googleusercontent.com")
    YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "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")
    YOUTUBE_REDIRECT_URI: str = os.getenv("YOUTUBE_REDIRECT_URI", "http://localhost:8000/auth/youtube/callback")

    FACEBOOK_APP_ID: str = os.getenv("FACEBOOK_APP_ID", "your_app_id")
    FACEBOOK_APP_SECRET: str = os.getenv("FACEBOOK_APP_SECRET", "your_app_secret")
    FACEBOOK_REDIRECT_URI: str = os.getenv("FACEBOOK_REDIRECT_URI", "http://localhost:8000/auth/facebook/callback")
    FACEBOOK_API_VERSION: str = os.getenv("FACEBOOK_API_VERSION", "v23.0")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
