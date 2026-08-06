import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://socialpilot_user:socialpilot_password@postgres:5432/socialpilot_db"
    MONGODB_URL: str = "mongodb://admin:admin_password@mongodb:27017/socialpilot_db?authSource=admin"
    SECRET_KEY: str = "949f2b86121406e9389da6d54203df88f1dc3ffad2dc7d9d0c262ad1bc7a8f3b"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
