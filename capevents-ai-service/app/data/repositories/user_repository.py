from typing import Any

from app.data.db import execute_query, execute_scalar


def count_active_users() -> int:
    return int(
        execute_scalar(
            """
            SELECT COUNT(*)
            FROM users
            WHERE is_active = true
            """
        )
        or 0
    )


def get_active_users() -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.job_title,
            u.department_id,
            d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.is_active = true
        ORDER BY u.created_at ASC
        """
    )


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    rows = execute_query(
        """
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.job_title,
            u.department_id,
            d.name AS department_name
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.id = :user_id
        """,
        {"user_id": user_id},
    )

    return rows[0] if rows else None