from sqlalchemy import text
import pandas as pd

from app.data.db import engine


def read_sql_dataframe(query: str) -> pd.DataFrame:
    with engine.connect() as connection:
        return pd.read_sql_query(text(query), connection)


def load_runtime_users() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            first_name,
            last_name,
            email,
            department_id,
            is_active
        FROM users
        WHERE is_active = true;
    """)


def load_runtime_events() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            title,
            category,
            description,
            start_at,
            duration_minutes,
            location_type,
            location_name,
            meeting_url,
            address,
            capacity,
            registration_deadline,
            status,
            audience,
            target_department_id,
            created_by,
            created_at,
            updated_at
        FROM events
        WHERE status = 'PUBLISHED';
    """)


def load_runtime_registrations() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            event_id,
            user_id,
            status,
            registered_at,
            cancelled_at,
            attendance_status,
            cancel_reason
        FROM event_registrations;
    """)


def load_runtime_feedbacks() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            event_id,
            user_id,
            rating,
            comment,
            share_comment_publicly,
            created_at,
            updated_at
        FROM event_feedbacks;
    """)


def load_runtime_invitations() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            event_id,
            user_id,
            invited_by,
            target_type,
            status,
            message,
            sent_at,
            rsvp_response
        FROM event_invitations;
    """)


def load_runtime_interests() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            code,
            label_fr,
            display_order,
            is_active
        FROM interests
        WHERE is_active = true;
    """)


def load_runtime_user_interests() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            user_id,
            interest_id
        FROM user_interests;
    """)


def load_runtime_points() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            user_id,
            event_id,
            type,
            points_delta,
            reason,
            created_at
        FROM points_transactions;
    """)


def load_runtime_badges() -> pd.DataFrame:
    return read_sql_dataframe("""
        SELECT
            id,
            user_id,
            badge_code,
            unlocked_at
        FROM user_badges;
    """)