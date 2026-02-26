"""Database connection module using psycopg2 with connection pooling."""

import os
import logging
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2 import pool, extras

logger = logging.getLogger(__name__)

_connection_pool: Optional[pool.ThreadedConnectionPool] = None


def get_database_url() -> str:
    """Get database URL from environment variables."""
    url = os.getenv("DATABASE_URL", "")
    if not url:
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "muzayede")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "postgres")
        url = f"postgresql://{user}:{password}@{host}:{port}/{name}"
    return url


def init_pool(min_connections: int = 2, max_connections: int = 10) -> None:
    """Initialize the connection pool."""
    global _connection_pool

    if _connection_pool is not None:
        return

    database_url = get_database_url()
    try:
        _connection_pool = pool.ThreadedConnectionPool(
            minconn=min_connections,
            maxconn=max_connections,
            dsn=database_url,
        )
        logger.info("Database connection pool initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")
        _connection_pool = None


def close_pool() -> None:
    """Close the connection pool."""
    global _connection_pool
    if _connection_pool is not None:
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Database connection pool closed")


@contextmanager
def get_connection():
    """Get a database connection from the pool."""
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


def execute_query(query: str, params: tuple = None, fetch: bool = True) -> list[dict]:
    """Execute a query and return results as list of dicts."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                rows = cur.fetchall()
                return [dict(row) for row in rows]
            return []


def execute_query_one(query: str, params: tuple = None) -> Optional[dict]:
    """Execute a query and return a single result as dict."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute_update(query: str, params: tuple = None) -> int:
    """Execute an update/insert/delete and return affected row count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.rowcount
