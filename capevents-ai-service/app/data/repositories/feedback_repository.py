from typing import Any

from app.data.db import execute_query, execute_scalar


def count_feedbacks() -> int:
    return int(execute_scalar("SELECT COUNT(*) FROM event_feedbacks") or 0)


def get_feedbacks_for_event(event_id: str) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT
            f.id,
            f.event_id,
            f.user_id,
            f.rating,
            f.comment,
            f.share_comment_publicly,
            f.created_at,
            e.title AS event_title,
            e.category AS event_category
        FROM event_feedbacks f
        JOIN events e ON e.id = f.event_id
        WHERE f.event_id = :event_id
        ORDER BY f.created_at ASC
        """,
        {"event_id": event_id},
    )


def get_recent_feedbacks(limit: int = 100) -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT
            f.id,
            f.event_id,
            f.user_id,
            f.rating,
            f.comment,
            f.share_comment_publicly,
            f.created_at,
            e.title AS event_title,
            e.category AS event_category
        FROM event_feedbacks f
        JOIN events e ON e.id = f.event_id
        ORDER BY f.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )