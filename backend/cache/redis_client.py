import os
import json
import logging
import redis as redis_lib

logger = logging.getLogger(__name__)

_client: redis_lib.Redis | None = None


def init_redis() -> None:
    global _client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        client = redis_lib.from_url(redis_url, decode_responses=True)
        client.ping()
        _client = client
        logger.info(f"Redis connected at {redis_url}")
    except Exception as e:
        logger.warning(f"Redis unavailable ({e}). Caching disabled — app will work without it.")
        _client = None


def close_redis() -> None:
    global _client
    if _client:
        _client.close()
        _client = None


def cache_get(key: str) -> dict | list | None:
    if not _client:
        return None
    try:
        value = _client.get(key)
        return json.loads(value) if value else None
    except Exception as e:
        logger.warning(f"Cache get failed for '{key}': {e}")
        return None


def cache_set(key: str, value: dict | list, ttl: int = 60) -> None:
    if not _client:
        return
    try:
        _client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"Cache set failed for '{key}': {e}")


def cache_delete(*keys: str) -> None:
    if not _client:
        return
    try:
        _client.delete(*keys)
    except Exception as e:
        logger.warning(f"Cache delete failed for {keys}: {e}")
