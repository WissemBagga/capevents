import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


DATASET_PATH = Path("datasets/processed/recommendation_train.csv")
REPORT_PATH = Path("reports/recommendation_dataset_audit.json")


REMINDER_COLUMNS = [
    "was_reminded",
    "pair_reminder_count",
    "days_since_last_reminder",
    "user_total_reminders_received",
    "event_total_reminders_sent",
]


def safe_value_counts(df: pd.DataFrame, column: str) -> dict:
    if column not in df.columns:
        return {}

    return {
        str(key): int(value)
        for key, value in df[column].value_counts(dropna=False).to_dict().items()
    }


def numeric_summary(df: pd.DataFrame, column: str) -> dict:
    if column not in df.columns:
        return {
            "exists": False
        }

    series = pd.to_numeric(df[column], errors="coerce").fillna(0)

    return {
        "exists": True,
        "min": float(series.min()),
        "max": float(series.max()),
        "mean": float(series.mean()),
        "non_zero_count": int((series != 0).sum()),
        "zero_count": int((series == 0).sum())
    }


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset introuvable : {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    reminder_summary = {
        column: numeric_summary(df, column)
        for column in REMINDER_COLUMNS
    }

    was_reminded_count = 0
    was_reminded_rate = 0.0

    if "was_reminded" in df.columns and len(df) > 0:
        was_reminded = pd.to_numeric(df["was_reminded"], errors="coerce").fillna(0)
        was_reminded_count = int((was_reminded == 1).sum())
        was_reminded_rate = float(was_reminded_count / len(df))

    recommendation = "READY_FOR_BASELINE_ONLY"

    if was_reminded_count >= 200 and was_reminded_rate >= 0.02:
        recommendation = "CAN_TEST_REMINDER_FEATURES"

    if was_reminded_count >= 500 and was_reminded_rate >= 0.05:
        recommendation = "ENOUGH_SIGNAL_FOR_V1_1_CANDIDATE"

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(DATASET_PATH),

        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "users": int(df["user_id"].nunique()) if "user_id" in df.columns else 0,
        "events": int(df["event_id"].nunique()) if "event_id" in df.columns else 0,

        "target_score_distribution": safe_value_counts(df, "target_score"),
        "data_source_distribution": safe_value_counts(df, "data_source"),

        "reminder_features": reminder_summary,
        "was_reminded_count": was_reminded_count,
        "was_reminded_rate": round(was_reminded_rate, 6),

        "decision": recommendation,
        "decision_explanation": {
            "READY_FOR_BASELINE_ONLY": (
                "Les colonnes de relance existent, mais le volume de relances est trop faible "
                "pour entraîner une version v1.1.0 fiable basée sur ces signaux."
            ),
            "CAN_TEST_REMINDER_FEATURES": (
                "Le signal de relance commence à exister. Une version candidate peut être testée, "
                "mais elle ne doit pas être promue sans amélioration claire des métriques."
            ),
            "ENOUGH_SIGNAL_FOR_V1_1_CANDIDATE": (
                "Le volume de relances est suffisant pour entraîner et comparer une vraie candidate v1.1.0."
            )
        }[recommendation]
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with REPORT_PATH.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    print("\n=== Recommendation Dataset Audit ===")
    print(f"Rows: {report['rows']}")
    print(f"Users: {report['users']}")
    print(f"Events: {report['events']}")
    print(f"Was reminded count: {was_reminded_count}")
    print(f"Was reminded rate: {round(was_reminded_rate * 100, 2)}%")
    print(f"Decision: {recommendation}")
    print(f"Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()