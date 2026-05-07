from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


INPUT_DIR = Path("datasets/raw/capevents")
OUTPUT_FILE = Path("datasets/processed/planning_train.csv")


CANCELLED_REGISTRATION_VALUES = {
    "CANCELLED",
    "UNREGISTERED"
}

PRESENT_ATTENDANCE_VALUES = {
    "PRESENT",
    "ATTENDED",
    "CONFIRMED_PRESENT"
}


def read_csv_if_exists(path: Path) -> pd.DataFrame:
    if not path.exists():
        print(f"[WARN] Fichier introuvable : {path}")
        return pd.DataFrame()

    return pd.read_csv(path)


def read_first_existing(paths: list[Path]) -> pd.DataFrame:
    for path in paths:
        if path.exists():
            return pd.read_csv(path)

    print(f"[WARN] Aucun fichier trouvé parmi : {paths}")
    return pd.DataFrame()


def normalize_id(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def safe_numeric(series: pd.Series, default: float = 0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(default)


def parse_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


def prepare_events(events: pd.DataFrame) -> pd.DataFrame:
    events = events.copy()

    events["event_id"] = events["id"].apply(normalize_id)
    events["event_title"] = events["title"].fillna("").astype(str)
    events["event_category"] = events["category"].fillna("Autre").astype(str)
    events["event_audience"] = events["audience"].fillna("UNKNOWN").astype(str)
    events["event_location_type"] = events["location_type"].fillna("UNKNOWN").astype(str)
    events["event_status"] = events["status"].fillna("UNKNOWN").astype(str).str.upper()

    events["start_at_dt"] = parse_datetime(events["start_at"])
    events["event_start_at"] = events["start_at"].fillna("").astype(str)

    events["target_department_id"] = safe_numeric(
        events.get("target_department_id", pd.Series([0] * len(events))),
        default=0
    ).astype(int)

    events["capacity"] = safe_numeric(events["capacity"], default=0)
    events["duration_minutes"] = safe_numeric(events["duration_minutes"], default=0)

    events["day_of_week"] = events["start_at_dt"].dt.dayofweek.fillna(-1).astype(int)
    events["hour"] = events["start_at_dt"].dt.hour.fillna(-1).astype(int)
    events["month"] = events["start_at_dt"].dt.month.fillna(-1).astype(int)

    events["is_morning"] = events["hour"].between(8, 11).astype(int)
    events["is_afternoon"] = events["hour"].between(12, 17).astype(int)
    events["is_afterwork"] = (events["hour"] >= 18).astype(int)

    events["event_date"] = events["start_at_dt"].dt.date.astype(str)
    iso_calendar = events["start_at_dt"].dt.isocalendar()
    events["event_week"] = iso_calendar.week.fillna(0).astype(int)
    events["event_year"] = events["start_at_dt"].dt.year.fillna(0).astype(int)

    return events


def build_registration_aggregates(registrations: pd.DataFrame) -> pd.DataFrame:
    if registrations.empty:
        return pd.DataFrame(columns=[
            "event_id",
            "registered_count",
            "present_count"
        ])

    registrations = registrations.copy()
    registrations["event_id"] = registrations["event_id"].apply(normalize_id)
    registrations["status"] = registrations["status"].fillna("").astype(str).str.upper()
    registrations["attendance_status"] = registrations["attendance_status"].fillna("").astype(str).str.upper()

    active_regs = registrations[
        ~registrations["status"].isin(CANCELLED_REGISTRATION_VALUES)
    ].copy()

    active_regs["is_present"] = active_regs["attendance_status"].isin(
        PRESENT_ATTENDANCE_VALUES
    ).astype(int)

    return active_regs.groupby("event_id").agg(
        registered_count=("event_id", "count"),
        present_count=("is_present", "sum")
    ).reset_index()


def build_feedback_aggregates(feedbacks: pd.DataFrame) -> pd.DataFrame:
    if feedbacks.empty:
        return pd.DataFrame(columns=[
            "event_id",
            "feedback_count",
            "average_rating"
        ])

    feedbacks = feedbacks.copy()
    feedbacks["event_id"] = feedbacks["event_id"].apply(normalize_id)
    feedbacks["rating"] = safe_numeric(feedbacks["rating"], default=0)

    return feedbacks.groupby("event_id").agg(
        feedback_count=("rating", "count"),
        average_rating=("rating", "mean")
    ).reset_index()


def build_invitation_aggregates(invitations: pd.DataFrame) -> pd.DataFrame:
    if invitations.empty:
        return pd.DataFrame(columns=[
            "event_id",
            "invitation_count",
            "rsvp_yes_count",
            "rsvp_maybe_count",
            "rsvp_no_count"
        ])

    invitations = invitations.copy()
    invitations["event_id"] = invitations["event_id"].apply(normalize_id)
    invitations["rsvp_response"] = invitations["rsvp_response"].fillna("").astype(str).str.upper()

    invitations["rsvp_yes"] = (invitations["rsvp_response"] == "YES").astype(int)
    invitations["rsvp_maybe"] = (invitations["rsvp_response"] == "MAYBE").astype(int)
    invitations["rsvp_no"] = (invitations["rsvp_response"] == "NO").astype(int)

    return invitations.groupby("event_id").agg(
        invitation_count=("event_id", "count"),
        rsvp_yes_count=("rsvp_yes", "sum"),
        rsvp_maybe_count=("rsvp_maybe", "sum"),
        rsvp_no_count=("rsvp_no", "sum")
    ).reset_index()


def build_department_sizes(users: pd.DataFrame) -> pd.DataFrame:
    if users.empty or "department_id" not in users.columns:
        return pd.DataFrame(columns=[
            "target_department_id",
            "department_size"
        ])

    users = users.copy()
    users["department_id"] = safe_numeric(users["department_id"], default=0).astype(int)

    if "is_active" in users.columns:
        users["is_active_str"] = users["is_active"].fillna("").astype(str).str.lower()
        users = users[
            users["is_active_str"].isin(["true", "1", "yes", "y"])
        ].copy()

    return users.groupby("department_id").size().reset_index(name="department_size").rename(
        columns={"department_id": "target_department_id"}
    )


def add_conflict_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    same_day_counts = df.groupby("event_date").size().rename("events_same_day_count")
    df = df.merge(same_day_counts, on="event_date", how="left")
    df["events_same_day_count"] = (df["events_same_day_count"] - 1).clip(lower=0)

    dept_week_counts = df.groupby([
        "target_department_id",
        "event_year",
        "event_week"
    ]).size().rename("events_same_department_same_week_count")

    df = df.merge(
        dept_week_counts,
        on=["target_department_id", "event_year", "event_week"],
        how="left"
    )

    df["events_same_department_same_week_count"] = (
        df["events_same_department_same_week_count"] - 1
    ).clip(lower=0)

    df.loc[
        df["target_department_id"] <= 0,
        "events_same_department_same_week_count"
    ] = 0

    return df


def add_targets(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["registration_rate"] = (
        df["registered_count"] / df["capacity"].replace(0, np.nan)
    ).fillna(0).clip(0, 1)

    df["attendance_rate"] = (
        df["present_count"] / df["registered_count"].replace(0, np.nan)
    ).fillna(0).clip(0, 1)

    df["rsvp_yes_rate"] = (
        df["rsvp_yes_count"] / df["invitation_count"].replace(0, np.nan)
    ).fillna(0).clip(0, 1)

    df["rsvp_no_rate"] = (
        df["rsvp_no_count"] / df["invitation_count"].replace(0, np.nan)
    ).fillna(0).clip(0, 1)

    df["success_score"] = (
        0.60 * df["registration_rate"]
        + 0.30 * df["attendance_rate"]
        + 0.10 * (df["average_rating"].fillna(0) / 5).clip(0, 1)
    ).clip(0, 1)

    conditions = [
        df["success_score"] >= 0.70,
        df["success_score"] >= 0.40
    ]

    choices = [
        "HIGH",
        "MEDIUM"
    ]

    df["success_label"] = np.select(
        conditions,
        choices,
        default="LOW"
    )

    df["outcome_available"] = (
        (df["capacity"] > 0)
        & (
            (df["registered_count"] > 0)
            | (df["invitation_count"] > 0)
            | (df["feedback_count"] > 0)
        )
    ).astype(int)

    return df


def historical_mean(
    previous: pd.DataFrame,
    filter_column: str,
    filter_value: Any,
    target_column: str,
    fallback: float
) -> float:
    if previous.empty or filter_column not in previous.columns:
        return fallback

    rows = previous[previous[filter_column] == filter_value]

    if rows.empty:
        return fallback

    return float(rows[target_column].mean())


def add_historical_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values("start_at_dt").reset_index(drop=True)

    historical_columns = [
        "historical_category_registration_rate",
        "historical_category_attendance_rate",
        "historical_department_participation_rate",
        "historical_hour_registration_rate",
        "historical_day_registration_rate"
    ]

    for column in historical_columns:
        df[column] = 0.0

    for index in range(len(df)):
        previous = df.iloc[:index]

        if previous.empty:
            continue

        global_registration_rate = float(previous["registration_rate"].mean())
        global_attendance_rate = float(previous["attendance_rate"].mean())

        row = df.iloc[index]

        df.at[index, "historical_category_registration_rate"] = historical_mean(
            previous,
            "event_category",
            row["event_category"],
            "registration_rate",
            global_registration_rate
        )

        df.at[index, "historical_category_attendance_rate"] = historical_mean(
            previous,
            "event_category",
            row["event_category"],
            "attendance_rate",
            global_attendance_rate
        )

        df.at[index, "historical_department_participation_rate"] = historical_mean(
            previous,
            "target_department_id",
            row["target_department_id"],
            "attendance_rate",
            global_attendance_rate
        )

        df.at[index, "historical_hour_registration_rate"] = historical_mean(
            previous,
            "hour",
            row["hour"],
            "registration_rate",
            global_registration_rate
        )

        df.at[index, "historical_day_registration_rate"] = historical_mean(
            previous,
            "day_of_week",
            row["day_of_week"],
            "registration_rate",
            global_registration_rate
        )

    return df


def main() -> None:
    users = read_csv_if_exists(INPUT_DIR / "users.csv")
    departments = read_first_existing([
        INPUT_DIR / "departments.csv",
        INPUT_DIR / "departement.csv"
    ])
    events = read_csv_if_exists(INPUT_DIR / "events.csv")
    registrations = read_csv_if_exists(INPUT_DIR / "event_registrations.csv")
    feedbacks = read_csv_if_exists(INPUT_DIR / "event_feedbacks.csv")
    invitations = read_csv_if_exists(INPUT_DIR / "event_invitations.csv")

    if events.empty:
        raise RuntimeError("events.csv est obligatoire pour construire le dataset planning.")

    events = prepare_events(events)

    reg_agg = build_registration_aggregates(registrations)
    feedback_agg = build_feedback_aggregates(feedbacks)
    invitation_agg = build_invitation_aggregates(invitations)
    department_sizes = build_department_sizes(users)

    dataset = events.merge(reg_agg, on="event_id", how="left")
    dataset = dataset.merge(feedback_agg, on="event_id", how="left")
    dataset = dataset.merge(invitation_agg, on="event_id", how="left")
    dataset = dataset.merge(department_sizes, on="target_department_id", how="left")

    for column in [
        "registered_count",
        "present_count",
        "feedback_count",
        "average_rating",
        "invitation_count",
        "rsvp_yes_count",
        "rsvp_maybe_count",
        "rsvp_no_count",
        "department_size"
    ]:
        if column not in dataset.columns:
            dataset[column] = 0
        dataset[column] = safe_numeric(dataset[column], default=0)

    dataset = add_conflict_features(dataset)
    dataset = add_targets(dataset)
    dataset = add_historical_features(dataset)

    output_columns = [
        "event_id",
        "event_title",
        "event_start_at",
        "event_status",

        "event_category",
        "event_audience",
        "event_location_type",
        "target_department_id",
        "capacity",
        "duration_minutes",

        "day_of_week",
        "hour",
        "month",
        "is_morning",
        "is_afternoon",
        "is_afterwork",

        "department_size",
        "events_same_day_count",
        "events_same_department_same_week_count",

        "historical_category_registration_rate",
        "historical_category_attendance_rate",
        "historical_department_participation_rate",
        "historical_hour_registration_rate",
        "historical_day_registration_rate",

        "registered_count",
        "present_count",
        "invitation_count",
        "rsvp_yes_count",
        "rsvp_maybe_count",
        "rsvp_no_count",
        "feedback_count",
        "average_rating",

        "registration_rate",
        "attendance_rate",
        "rsvp_yes_rate",
        "rsvp_no_rate",
        "success_score",
        "success_label",
        "outcome_available"
    ]

    for column in output_columns:
        if column not in dataset.columns:
            dataset[column] = 0

    final_dataset = dataset[output_columns].copy()

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    final_dataset.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

    print("\n=== Planning dataset created ===")
    print(f"Output: {OUTPUT_FILE}")
    print(f"Rows: {len(final_dataset)}")
    print(f"Events: {final_dataset['event_id'].nunique()}")
    print("\nSuccess label distribution:")
    print(final_dataset["success_label"].value_counts())
    print("\nOutcome availability:")
    print(final_dataset["outcome_available"].value_counts())


if __name__ == "__main__":
    main()