import os
import sys
import time
import logging
import datetime

# Add root workspace directory to sys.path to support database imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text

from app.presentation.routes import history, auth, users, content, campaigns, analytics, notifications
from app.api import youtube, facebook
from app.models.facebook import FacebookAccount, FacebookPage
from database.postgresql.connection import init_db
from database.mongodb.connection import close_mongo_client, get_mongo_client, init_mongo_indexes
from database.redis.connection import get_redis_client
from app.presentation.dependencies.auth import RBACException
from app.core.config import settings

# ── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("socialpilot")

# ── Parse allowed CORS origins ────────────────────────────────────────────────
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app = FastAPI(
    title="SocialPilot API",
    description=(
        "Social Media Scheduler & Campaign Management Platform.\n\n"
        "Modules: **Auth**, **Users/RBAC**, **Content & Scheduling**, "
        "**Campaigns**, **Analytics**, **Notifications**, **YouTube/Facebook OAuth**.\n\n"
        "Authentication: Bearer JWT tokens — use `POST /api/auth/login` to obtain one."
    ),
    version="1.0.0",
    contact={"name": "SocialPilot Team-A", "url": "https://github.com/suvakovan/AI-ENGINEER"},
    license_info={"name": "MIT"},
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Timing middleware (adds X-Process-Time header) ────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
    if duration_ms > 500:
        logger.warning("Slow request: %s %s took %.2fms", request.method, request.url.path, duration_ms)
    return response

# ── CORS (must be registered before routes) ───────────────────────────────────
if settings.ENVIRONMENT == "production":
    # Strict: only allow explicitly listed origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )
else:
    # Development: allow all localhost variants and local network IPs
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ── Exception handlers ────────────────────────────────────────────────────────
@app.exception_handler(RBACException)
async def rbac_exception_handler(request: Request, exc: RBACException):
    return JSONResponse(
        status_code=403,
        content={
            "detail": exc.detail,
            "required_role": exc.required_role,
            "your_role": exc.your_role,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    if settings.ENVIRONMENT == "production":
        # Never expose internal details in production
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred. Please try again later."},
        )
    # In development, include the error message for debugging
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(history.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(content.router)
app.include_router(content.router, prefix="/api")
app.include_router(campaigns.router)
app.include_router(analytics.router)
app.include_router(youtube.router)
app.include_router(facebook.router)
app.include_router(notifications.router)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_db():
    try:
        init_db()
        logger.info("PostgreSQL tables initialized successfully.")
    except Exception as e:
        logger.error("Failed to initialize PostgreSQL tables: %s", e)
    try:
        await init_mongo_indexes()
        logger.info("MongoDB indexes initialized successfully.")
    except Exception as e:
        logger.error("Failed to initialize MongoDB indexes: %s", e)


@app.on_event("shutdown")
async def shutdown_db():
    close_mongo_client()


# ── Root & health endpoints ───────────────────────────────────────────────────
@app.get("/", tags=["System"], summary="API root")
def read_root():
    """Returns a welcome message and confirms the API is running."""
    return {
        "message": "Welcome to SocialPilot API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0",
    }


@app.get("/health", tags=["System"], summary="Health check (alias)")
@app.get("/api/health", tags=["System"], summary="Health check")
def health_check():
    """
    Checks connectivity to PostgreSQL and MongoDB.
    Returns `healthy` status with per-database connection state.
    """
    postgres_status = "disconnected"
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://socialpilot_user:socialpilot_password@postgres:5432/socialpilot_db"
    )
    try:
        engine = create_engine(db_url, connect_args={"connect_timeout": 2}, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        postgres_status = "connected"
    except Exception as e:
        postgres_status = f"error: {str(e)}"

    mongodb_status = "disconnected"
    try:
        client = get_mongo_client()
        # Trigger an action to force connection check
        client.admin.command("ping")
        mongodb_status = "connected"
    except Exception as e:
        mongodb_status = f"error: {str(e)}"

    redis_status = "disconnected"
    try:
        get_redis_client().ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = f"error: {str(e)}"

    overall = "healthy" if all(value == "connected" for value in (postgres_status, mongodb_status, redis_status)) else "degraded"
    return {
        "status": overall,
        "database": postgres_status,
        "mongodb": mongodb_status,
        "redis": redis_status,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }
