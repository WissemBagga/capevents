from typing import Any

from app.data.db import execute_query, execute_scalar


def count_events() -> int:
    return int(execute_scalar("SELECT COUNT(*) FROM events") or 0)


def count_published_events() -> int:
    return int(
        execute_scalar(
            """
            SELECT COUNT(*)
            FROM events
            WHERE status = 'PUBLISHED'
            """
        )
        or 0
    )


def get_published_future_events(limit: int = 100) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT
            e.id,
            e.title,
            e.category,
            e.description,
            e.start_at,
            e.duration_minutes,
            e.location_type,
            e.capacity,
            e.registration_deadline,
            e.status,
            e.audience,
            e.target_department_id,
            d.name AS target_department_name,
            e.created_by
        FROM events e
        LEFT JOIN departments d ON d.id = e.target_department_id
        WHERE e.status = 'PUBLISHED'
          AND e.start_at > NOW()
          AND e.registration_deadline > NOW()
        ORDER BY e.start_at ASC
        LIMIT :limit
        """,
        {"limit": limit},
    )


def get_event_by_id(event_id: str) -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT
            e.id,
            e.title,
            e.category,
            e.description,
            e.start_at,
            e.duration_minutes,
            e.location_type,
            e.capacity,
            e.registration_deadline,
            e.status,
            e.audience,
            e.target_department_id,
            d.name AS target_department_name,
            e.created_by
        FROM events e
        LEFT JOIN departments d ON d.id = e.target_department_id
        WHERE e.id = :event_id
        """,
        {"event_id": event_id},
    )

    return rows[0] if rows else None