import os
import logging
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extensions import connection as Connection
from dotenv import load_dotenv

load_dotenv()

## setup multi threaded pooling so that there's no overhead and our app does not open and close connection on every request
## it does this by opening up multiple connections and switches between them for user requests
logger = logging.getLogger(__name__)

_pool: ThreadedConnectionPool | None = None


def init_pool() -> None:
    global _pool
    min_conn = int(os.getenv("DB_POOL_MIN_CONN", "2"))
    max_conn = int(os.getenv("DB_POOL_MAX_CONN", "10"))
    _pool = ThreadedConnectionPool(
        minconn=min_conn,
        maxconn=max_conn,
        dsn=os.getenv("DATABASE_URL"),
    )
    logger.info(f"DB connection pool initialized (min={min_conn}, max={max_conn})")


def close_pool() -> None:
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None
        logger.info("DB connection pool closed")


def get_db() -> Connection:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized. Call init_pool() at startup.")
    conn = _pool.getconn()
    try:
        conn.cursor().execute("SELECT 1")
    except Exception:
        _pool.putconn(conn, close=True)
        conn = _pool.getconn()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
