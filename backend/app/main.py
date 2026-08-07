import os
import sys
import datetime

# Add root workspace directory to sys.path to support database imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from sqlalchemy import create_engine, text

from app.presentation.routes import history, auth, users, content
from app.api import youtube
from database.postgresql.connection import init_db
from database.mongodb.connection import init_mongo_indexes
from app.presentation.dependencies.auth import RBACException

app = FastAPI(
    title="SocialPilot Clean Architecture API",
    description="FastAPI Backend configured with Clean Architecture layers.",
    version="1.0.0"
)

# CORS must be registered FIRST (before routes) so it wraps all requests.
# FastAPI/Starlette applies middleware in reverse-registration order.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",      # Vite fallback port when 5173 is busy
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for RBAC validation failures
@app.exception_handler(RBACException)
async def rbac_exception_handler(request: Request, exc: RBACException):
    return JSONResponse(
        status_code=403,
        content={
            "detail": exc.detail,
            "required_role": exc.required_role,
            "your_role": exc.your_role
        }
    )

# Register routes
app.include_router(history.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(content.router)
app.include_router(youtube.router)

@app.on_event("startup")
async def startup_db():
    try:
        await init_mongo_indexes()
        print("MongoDB indexes initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize MongoDB indexes: {e}")




@app.get("/")
def read_root():
    return {"message": "Welcome to SocialPilot Clean Architecture API"}

@app.get("/api/health")
def health_check():
    # 1. Check PostgreSQL Connection
    postgres_status = "disconnected"
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://socialpilot_user:socialpilot_password@postgres:5432/socialpilot_db"
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
