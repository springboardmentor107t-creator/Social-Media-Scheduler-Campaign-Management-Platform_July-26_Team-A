import os
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from sqlalchemy import create_engine, text

app = FastAPI(
    title="SocialPilot Clean Architecture API",
    description="FastAPI Backend configured with Clean Architecture layers.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to SocialPilot Clean Architecture API"}

@app.get("/api/health")
def health_check():
    # 1. Check PostgreSQL Connection
    postgres_status = "disconnected"
    db_url = os.getenv(
        "DATABASE_URL", 
        "postgresql://socialpilot_user:socialpilot_password@postgres:5432/socialpilot_db"
    )
    try:
        engine = create_engine(db_url, connect_args={'connect_timeout': 2})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        postgres_status = "connected"
    except Exception as e:
        postgres_status = f"error: {str(e)}"

    # 2. Check MongoDB Connection
    mongodb_status = "disconnected"
    mongo_url = os.getenv(
        "MONGODB_URL", 
        "mongodb://admin:admin_password@mongodb:27017/socialpilot_db?authSource=admin"
    )
    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
        # Trigger an action to force connection check
        client.admin.command('ping')
        mongodb_status = "connected"
    except Exception as e:
        mongodb_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "database": postgres_status,
        "mongodb": mongodb_status,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
