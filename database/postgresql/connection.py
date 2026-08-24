import os
import time
import logging
from collections.abc import Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from .models import Base

load_dotenv()

logger = logging.getLogger(__name__)


def _get_database_url() -> str:
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")

    user = os.getenv("POSTGRES_USER", "socialpilot_user")
    password = os.getenv("POSTGRES_PASSWORD", "socialpilot_password")
    host = os.getenv("POSTGRES_HOST", "127.0.0.1")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "socialpilot_db")
    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{database}"


def _create_engine_with_retry(url: str, retries: int = 5, delay: float = 2.0) -> Engine:
    """Create engine with retry logic for Docker startup ordering."""
    pool_size = int(os.getenv("POSTGRES_POOL_SIZE", "10"))
    max_overflow = int(os.getenv("POSTGRES_MAX_OVERFLOW", "20"))
    pool_recycle = int(os.getenv("POSTGRES_POOL_RECYCLE", "1800"))
    connect_timeout = int(os.getenv("POSTGRES_CONNECT_TIMEOUT", "5"))

    for attempt in range(1, retries + 1):
        try:
            eng = create_engine(
                url,
                pool_size=pool_size,
                max_overflow=max_overflow,
                pool_recycle=pool_recycle,
                connect_args={"connect_timeout": connect_timeout},
                pool_pre_ping=True,
            )
            # Verify connection works
            with eng.connect() as conn:
                pass
            logger.info("PostgreSQL connection established (pool_size=%d, max_overflow=%d)", pool_size, max_overflow)
            return eng
        except Exception as e:
            if attempt < retries:
                logger.warning("DB connection attempt %d/%d failed: %s — retrying in %.1fs", attempt, retries, e, delay)
                time.sleep(delay)
            else:
                logger.error("All %d DB connection attempts failed", retries)
                return create_engine(
                    url,
                    pool_size=pool_size,
                    max_overflow=max_overflow,
                    pool_recycle=pool_recycle,
                    connect_args={"connect_timeout": connect_timeout},
                    pool_pre_ping=True,
                )


engine: Engine = _create_engine_with_retry(_get_database_url())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_engine() -> Engine:
    return engine


def get_session() -> Session:
    return SessionLocal()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
