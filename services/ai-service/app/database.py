"""Database connection module using psycopg2 with connection pooling."""

import logging
import os
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2 import pool, extras

logger = logging.getLogger(__name__)

_connection_pool: Optional[pool.ThreadedConnectionPool] = None


# ---------------------------------------------------------------------------
# Connection URL
# ---------------------------------------------------------------------------

def get_database_url() -> str:
    """Build a PostgreSQL DSN from environment variables."""
    url = os.getenv("DATABASE_URL", "")
    if url:
        return url
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "muzayede")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


# ---------------------------------------------------------------------------
# Pool lifecycle
# ---------------------------------------------------------------------------

def init_pool(min_connections: int = 2, max_connections: int = 10) -> None:
    """Initialise the threaded connection pool (idempotent)."""
    global _connection_pool
    if _connection_pool is not None:
        return

    dsn = get_database_url()
    try:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=min_connections,
            maxconn=max_connections,
            dsn=dsn,
        )
        logger.info("Database connection pool initialised (min=%d, max=%d)", min_connections, max_connections)
    except Exception as exc:
        logger.error("Failed to initialise database pool: %s", exc)
        _connection_pool = None


def close_pool() -> None:
    """Close every connection in the pool."""
    global _connection_pool
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")


# ---------------------------------------------------------------------------
# Connection context manager
# ---------------------------------------------------------------------------

@contextmanager
def get_connection():
    """Yield a connection from the pool; commit on success, rollback on error."""
    global _connection_pool

    if _connection_pool is None:
        init_pool()

    if _connection_pool is None:
        raise RuntimeError("Database connection pool is not available")

    conn = _connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _connection_pool.putconn(conn)


# ---------------------------------------------------------------------------
# Convenience helpers
# ---------------------------------------------------------------------------

def execute_query(query: str, params: tuple = None, fetch: bool = True) -> list[dict]:
    """Execute *query* and return every row as a ``dict``."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                return [dict(row) for row in cur.fetchall()]
            return []


def execute_query_one(query: str, params: tuple = None) -> Optional[dict]:
    """Execute *query* and return the first row as a ``dict`` (or ``None``)."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute_update(query: str, params: tuple = None) -> int:
    """Execute an INSERT / UPDATE / DELETE and return affected row count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.rowcount
