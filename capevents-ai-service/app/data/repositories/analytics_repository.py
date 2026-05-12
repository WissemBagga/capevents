from typing import Any

from app.data.db import execute_query, execute_scalar


def count_registrations() -> int:
    return int(execute_scalar("SELECT COUNT(*) FROM event_registrations") or 0)


def count_invitations() -> int:
    return int(execute_scalar("SELECT COUNT(*) FROM event_invitations") or 0)


def get_department_engagement_summary() -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT
            d.id AS department_id,
            d.name AS department_name,
            COUNT(DISTINCT u.id) AS total_users,
            COUNT(DISTINCT r.id) AS total_registrations,
            COUNT(DISTINCT CASE WHEN r.attendance_status = 'PRESENT' THEN r.id END) AS total_present,
            COUNT(DISTINCT CASE WHEN r.attendance_status = 'ABSENT' THEN r.id END) AS total_absent
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.id AND u.is_active = true
        LEFT JOIN event_registrations r ON r.user_id = u.id
        GROUP BY d.id, d.name
        ORDER BY d.id ASC
        """
    )


def get_category_performance_summary() -> list[dict[str, Any]]:
    return execute_query(
        """
        SELECT
            e.category,
            COUNT(DISTINCT e.id) AS total_events,
            COUNT(DISTINCT r.id) AS total_registrations,
            COUNT(DISTINCT CASE WHEN r.attendance_status = 'PRESENT' THEN r.id END) AS total_present,
            ROUND(AVG(f.rating)::numeric, 2) AS average_rating
        FROM events e
        LEFT JOIN event_registrations r ON r.event_id = e.id
        LEFT JOIN event_feedbacks f ON f.event_id = e.id
        GROUP BY e.category
        ORDER BY total_events DESC
        """
    )