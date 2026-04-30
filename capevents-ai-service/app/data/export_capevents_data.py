import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from app.data.db import engine


RAW_CAPEVENTS_DIR = Path("datasets/raw/capevents")
RAW_CAPEVENTS_DIR.mkdir(parents=True, exist_ok=True)


EXPORT_QUERIES: dict[str, str] = {
    "users": """
        SELECT
            id,
            first_name,
            last_name,
            email,
            phone,
            job_title,
            department_id,
            is_active,
            email_verified,
            created_at,
            last_login_at
        FROM users;
    """,

    "departments": """
        SELECT
            id,
            name
        FROM departments;
    """,

    "events": """
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
            updated_at,
            cancel_reason
        FROM events;
    """,

    "event_registrations": """
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
    """,

    "event_feedbacks": """
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
    """,

    "interests": """
        SELECT
            id,
            code,
            label_fr,
            display_order,
            is_active
        FROM interests;
    """,

    "user_interests": """
        SELECT
            user_id,
            interest_id
        FROM user_interests;
    """,

    "points_transactions": """
        SELECT
            id,
            user_id,
            event_id,
            type,
            points_delta,
            reason,
            created_at
        FROM points_transactions;
    """,

    "user_badges": """
        SELECT
            id,
            user_id,
            badge_code,
            unlocked_at
        FROM user_badges;
    """,

    "event_invitations": """
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
    """
}


def export_query_to_csv(dataset_name: str, sql_query: str) -> dict:
    output_path = RAW_CAPEVENTS_DIR / f"{dataset_name}.csv"

    try:
        dataframe = pd.read_sql_query(text(sql_query), engine)
        dataframe.to_csv(output_path, index=False, encoding="utf-8")

        return {
            "dataset": dataset_name,
            "status": "EXPORTED",
            "rows": int(len(dataframe)),
            "path": str(output_path)
        }

    except Exception as exc:
        return {
            "dataset": dataset_name,
            "status": "FAILED",
            "rows": 0,
            "path": str(output_path),
            "error": str(exc)
        }


def main() -> None:
    manifest = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source": "CAPEVENTS_POSTGRESQL",
        "datasets": []
    }

    print("\n=== Export CapEvents datasets ===\n")

    for dataset_name, sql_query in EXPORT_QUERIES.items():
        result = export_query_to_csv(dataset_name, sql_query)
        manifest["datasets"].append(result)

        if result["status"] == "EXPORTED":
            print(f"[OK] {dataset_name}: {result['rows']} lignes -> {result['path']}")
        else:
            print(f"[FAILED] {dataset_name}: {result.get('error')}")

    manifest_path = RAW_CAPEVENTS_DIR / "export_manifest.json"
    with manifest_path.open("w", encoding="utf-8") as file:
        json.dump(manifest, file, indent=2, ensure_ascii=False)

    print(f"\nManifest créé: {manifest_path}")


if __name__ == "__main__":
    main()