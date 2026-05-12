from collections.abc import Sequence
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import settings


engine: Engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)


def test_database_connection() -> bool:
    """
    Check whether the PostgreSQL database is reachable.
    Used by diagnostics and health endpoints.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def execute_query(query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """
    Execute a SELECT query and return rows as dictionaries.

    This helper is intended for read-only AI data access.
    Do not use it for destructive operations.
    """
    with engine.connect() as connection:
        result = connection.execute(text(query), params or {})
        return [dict(row._mapping) for row in result]


def execute_scalar(query: str, params: dict[str, Any] | None = None) -> Any:
    """
    Execute a query returning a single scalar value.
    """
    with engine.connect() as connection:
        result = connection.execute(text(query), params or {})
        return result.scalar()


def execute_many(query: str, params: Sequence[dict[str, Any]]) -> None:
    """
    Execute a batch query.

    Use only for controlled internal operations such as logging,
    never for modifying business data tables directly.
    """
    with engine.begin() as connection:
        connection.execute(text(query), list(params))