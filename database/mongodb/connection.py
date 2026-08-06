import os
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

load_dotenv()


def _get_mongo_uri() -> str:
    return os.getenv("MONGODB_URL") or os.getenv("MONGO_URI") or "mongodb://localhost:27017/socialpilot"


client = AsyncIOMotorClient(_get_mongo_uri())

def get_mongo_client() -> AsyncIOMotorClient:
    return client


async def get_mongo_db() -> AsyncIOMotorDatabase:
    db_name = os.getenv("MONGO_DB", "socialpilot")
    return client[db_name]


async def init_mongo_indexes() -> None:
    db = await get_mongo_db()
    await db.users.create_index("email", unique=True)
    await db.social_accounts.create_index([("user_id", 1), ("provider", 1), ("provider_account_id", 1)], unique=True)
