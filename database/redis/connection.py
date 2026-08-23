import os

from redis import Redis


def _get_redis_url() -> str:
    return os.getenv("REDIS_URL", "redis://:socialpilot_redis_password@localhost:6379/0")


client = Redis.from_url(
    _get_redis_url(),
    socket_connect_timeout=int(os.getenv("REDIS_CONNECT_TIMEOUT", "5")),
    socket_timeout=int(os.getenv("REDIS_SOCKET_TIMEOUT", "5")),
    health_check_interval=30,
    decode_responses=True,
)


def get_redis_client() -> Redis:
    return client