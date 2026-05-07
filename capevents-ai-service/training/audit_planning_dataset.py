import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


DATASET_PATH = Path("datasets/processed/planning_train.csv")
REPORT_PATH = Path("reports/planning_dataset_audit.json")


REQUIRED_COLUMNS = [
    "event_id",
    "event_category",
    "event_audience",
    "event_location_type",
    "target_department_id",
    "capacity",
    "duration_minutes",
    "day_of_week",
    "hour",
    "month",
    "department_size",
    "events_same_day_count",
    "events_same_department_same_week_count",
    "historical_category_registration_rate",
    "historical_category_attendance_rate",
    "historical_department_participation_rate",
    "historical_hour_registration_rate",
    "historical_day_registration_rate",
    "registration_rate",
    "attendance_rate",
    "success_score",
    "success_label",
    "outcome_available"
]


def value_counts(df: pd.DataFrame, column: str) -> dict:
    if column not in df.columns:
        return {}

    return {
        str(key): int(value)
        for key, value in df[column].value_counts(dropna=False).to_dict().items()
    }


def numeric_summary(df: pd.DataFrame, column: str) -> dict:
    if column not in df.columns:
        return {"exists": False}

    series = pd.to_numeric(df[column], errors="coerce")

    return {
        "exists": True,
        "missing_count": int(series.isna().sum()),
        "min": float(series.fillna(0).min()),
        "max": float(series.fillna(0).max()),
        "mean": float(series.fillna(0).mean()),
        "non_zero_count": int((series.fillna(0) != 0).sum())
    }


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset introuvable : {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    missing_columns = [
        column for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    outcome_df = df[df["outcome_available"] == 1].copy() if "outcome_available" in df.columns else df.copy()

    label_distribution_all = value_counts(df, "success_label")
    label_distribution_trainable = value_counts(outcome_df, "success_label")

    high_count = int(label_distribution_trainable.get("HIGH", 0))
    medium_count = int(label_distribution_trainable.get("MEDIUM", 0))
    low_count = int(label_distribution_trainable.get("LOW", 0))
    trainable_rows = int(len(outcome_df))

    decision = "NOT_READY_FOR_CLASSIFIER"

    if trainable_rows >= 300 and high_count >= 30 and medium_count >= 30:
        decision = "CAN_TRAIN_CLASSIFIER_CANDIDATE"

    if trainable_rows >= 300:
        regression_ready = True
    else:
        regression_ready = False

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(DATASET_PATH),

        "rows_total": int(len(df)),
        "columns_total": int(len(df.columns)),
        "events": int(df["event_id"].nunique()) if "event_id" in df.columns else 0,

        "outcome_available_distribution": value_counts(df, "outcome_available"),
        "trainable_rows": trainable_rows,

        "success_label_distribution_all": label_distribution_all,
        "success_label_distribution_trainable": label_distribution_trainable,

        "missing_required_columns": missing_columns,

        "numeric_summaries": {
            "capacity": numeric_summary(df, "capacity"),
            "duration_minutes": numeric_summary(df, "duration_minutes"),
            "department_size": numeric_summary(df, "department_size"),
            "registration_rate": numeric_summary(df, "registration_rate"),
            "attendance_rate": numeric_summary(df, "attendance_rate"),
            "success_score": numeric_summary(df, "success_score"),
            "events_same_day_count": numeric_summary(df, "events_same_day_count"),
            "events_same_department_same_week_count": numeric_summary(df, "events_same_department_same_week_count")
        },

        "decision": decision,
        "regression_ready": regression_ready,
        "decision_explanation": (
            "Le dataset est utilisable pour un premier modèle de régression ou un scoring hybride, "
            "mais la classification HIGH/MEDIUM/LOW est trop déséquilibrée si HIGH et MEDIUM sont trop rares."
            if decision == "NOT_READY_FOR_CLASSIFIER"
            else "Le dataset contient assez d’exemples pour tester une candidate classifier."
        )
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with REPORT_PATH.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    print("\n=== Planning Dataset Audit ===")
    print(f"Rows total: {report['rows_total']}")
    print(f"Trainable rows: {trainable_rows}")
    print(f"Labels all: {label_distribution_all}")
    print(f"Labels trainable: {label_distribution_trainable}")
    print(f"Decision: {decision}")
    print(f"Regression ready: {regression_ready}")
    print(f"Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()