import os
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

load_dotenv()


def _get_mongo_uri() -> str:
    return os.getenv("MONGODB_URL") or os.getenv("MONGO_URI") or "mongodb://localhost:27017/socialpilot"


client = AsyncIOMotorClient(
    _get_mongo_uri(),
    maxPoolSize=int(os.getenv("MONGO_MAX_POOL_SIZE", "50")),
    minPoolSize=int(os.getenv("MONGO_MIN_POOL_SIZE", "5")),
    serverSelectionTimeoutMS=int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "5000")),
    connectTimeoutMS=int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "5000")),
    retryWrites=True,
)

def get_mongo_client() -> AsyncIOMotorClient:
    return client


async def get_mongo_db() -> AsyncIOMotorDatabase:
    db_name = os.getenv("MONGO_DB") or "socialpilot_db"
    return client[db_name]


async def init_mongo_indexes() -> None:
    db = await get_mongo_db()
    await db.users.create_index("email", unique=True)
    await db.social_accounts.create_index([("user_id", 1), ("provider", 1), ("provider_account_id", 1)], unique=True)
    # Notification indexes for fast queries
    await db.notifications.create_index([("target_user_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("created_at", -1)])


def close_mongo_client() -> None:
    client.close()
