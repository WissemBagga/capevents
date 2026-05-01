import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


CATEGORY_TO_INTEREST_CODES = {
    "Sport": ["SPORT_ACTIVITE"],
    "Bien-être": ["BIEN_ETRE_EQUILIBRE", "SANTE_PREVENTION"],
    "Formation": ["FORMATION_METIER", "LEADERSHIP", "GESTION_PROJET"],
    "Webinaire": ["FORMATION_METIER", "TECHNOLOGIE", "IA_DATA"],
    "Atelier": ["FORMATION_METIER", "COMMUNICATION", "GESTION_PROJET"],
    "Conférence": ["NETWORKING", "INNOVATION", "LEADERSHIP"],
    "Team building": ["TEAM_BUILDING"],
    "Culture d’entreprise": ["CULTURE_ENTREPRISE", "COMMUNICATION"],
    "Culture d'entreprise": ["CULTURE_ENTREPRISE", "COMMUNICATION"],
    "Afterwork": ["NETWORKING", "TEAM_BUILDING"],
    "Networking": ["NETWORKING"],
    "RSE": ["RSE", "SOLIDARITE_BENEVOLAT"],
    "Innovation": ["INNOVATION", "IA_DATA", "TECHNOLOGIE"],
    "Autre": []
}


PRESENT_ATTENDANCE_VALUES = {
    "PRESENT",
    "ATTENDED",
    "CONFIRMED_PRESENT"
}

ABSENT_ATTENDANCE_VALUES = {
    "ABSENT",
    "NO_SHOW",
    "MISSING"
}

CANCELLED_REGISTRATION_VALUES = {
    "CANCELLED",
    "UNREGISTERED"
}


def load_config(path: str = "configs/recommendation_dataset_config.json") -> dict:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def read_csv_if_exists(path: Path) -> pd.DataFrame:
    if not path.exists():
        print(f"[WARN] Fichier introuvable: {path}")
        return pd.DataFrame()

    return pd.read_csv(path)


def normalize_id(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def parse_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


def safe_numeric(series: pd.Series, default: float = 0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(default)


def build_user_interest_map(user_interests: pd.DataFrame, interests: pd.DataFrame) -> dict[str, set[str]]:
    if user_interests.empty or interests.empty:
        return {}

    user_interests = user_interests.copy()
    interests = interests.copy()

    user_interests["user_id"] = user_interests["user_id"].apply(normalize_id)
    user_interests["interest_id"] = safe_numeric(user_interests["interest_id"]).astype(int)

    interests["id"] = safe_numeric(interests["id"]).astype(int)
    interests["code"] = interests["code"].astype(str)

    merged = user_interests.merge(
        interests[["id", "code"]],
        left_on="interest_id",
        right_on="id",
        how="left"
    )

    result: dict[str, set[str]] = {}

    for user_id, group in merged.groupby("user_id"):
        codes = set(group["code"].dropna().astype(str).tolist())
        result[user_id] = codes

    return result


def build_user_points(points: pd.DataFrame) -> pd.DataFrame:
    if points.empty:
        return pd.DataFrame(columns=["user_id", "points_total", "points_events_count"])

    points = points.copy()
    points["user_id"] = points["user_id"].apply(normalize_id)
    points["points_delta"] = safe_numeric(points["points_delta"])

    grouped = points.groupby("user_id").agg(
        points_total=("points_delta", "sum"),
        points_events_count=("event_id", "nunique")
    ).reset_index()

    return grouped


def build_user_badges(badges: pd.DataFrame) -> pd.DataFrame:
    if badges.empty:
        return pd.DataFrame(columns=["user_id", "badges_count"])

    badges = badges.copy()
    badges["user_id"] = badges["user_id"].apply(normalize_id)

    grouped = badges.groupby("user_id").agg(
        badges_count=("badge_code", "nunique")
    ).reset_index()

    return grouped


def build_event_aggregates(registrations: pd.DataFrame, feedbacks: pd.DataFrame) -> pd.DataFrame:
    reg_agg = pd.DataFrame(columns=[
        "event_id",
        "event_registered_count",
        "event_present_count"
    ])

    if not registrations.empty:
        registrations = registrations.copy()
        registrations["event_id"] = registrations["event_id"].apply(normalize_id)
        registrations["status"] = registrations["status"].fillna("").astype(str)
        registrations["attendance_status"] = registrations["attendance_status"].fillna("").astype(str)

        active_regs = registrations[
            ~registrations["status"].isin(CANCELLED_REGISTRATION_VALUES)
        ]

        present_regs = active_regs[
            active_regs["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES)
        ]

        registered_count = active_regs.groupby("event_id").size().rename("event_registered_count")
        present_count = present_regs.groupby("event_id").size().rename("event_present_count")

        reg_agg = pd.concat([registered_count, present_count], axis=1).fillna(0).reset_index()

    feedback_agg = pd.DataFrame(columns=[
        "event_id",
        "event_avg_rating",
        "event_feedback_count"
    ])

    if not feedbacks.empty:
        feedbacks = feedbacks.copy()
        feedbacks["event_id"] = feedbacks["event_id"].apply(normalize_id)
        feedbacks["rating"] = safe_numeric(feedbacks["rating"])

        feedback_agg = feedbacks.groupby("event_id").agg(
            event_avg_rating=("rating", "mean"),
            event_feedback_count=("rating", "count")
        ).reset_index()

    event_agg = reg_agg.merge(feedback_agg, on="event_id", how="outer").fillna(0)

    return event_agg


def build_user_history(registrations: pd.DataFrame, feedbacks: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    if registrations.empty:
        return pd.DataFrame(columns=[
            "user_id",
            "user_total_registrations",
            "user_total_attendances",
            "user_attendance_rate",
            "user_avg_rating"
        ])

    regs = registrations.copy()
    regs["user_id"] = regs["user_id"].apply(normalize_id)
    regs["event_id"] = regs["event_id"].apply(normalize_id)
    regs["attendance_status"] = regs["attendance_status"].fillna("").astype(str)
    regs["status"] = regs["status"].fillna("").astype(str)

    active_regs = regs[
        ~regs["status"].isin(CANCELLED_REGISTRATION_VALUES)
    ].copy()

    active_regs["is_present"] = active_regs["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES).astype(int)

    user_reg = active_regs.groupby("user_id").agg(
        user_total_registrations=("event_id", "count"),
        user_total_attendances=("is_present", "sum")
    ).reset_index()

    user_reg["user_attendance_rate"] = (
        user_reg["user_total_attendances"] / user_reg["user_total_registrations"].replace(0, np.nan)
    ).fillna(0)

    if not feedbacks.empty:
        feedbacks = feedbacks.copy()
        feedbacks["user_id"] = feedbacks["user_id"].apply(normalize_id)
        feedbacks["rating"] = safe_numeric(feedbacks["rating"])

        user_feedback = feedbacks.groupby("user_id").agg(
            user_avg_rating=("rating", "mean")
        ).reset_index()
    else:
        user_feedback = pd.DataFrame(columns=["user_id", "user_avg_rating"])

    return user_reg.merge(user_feedback, on="user_id", how="left").fillna(0)


def build_user_category_history(registrations: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    if registrations.empty or events.empty:
        return pd.DataFrame(columns=[
            "user_id",
            "category",
            "user_category_registrations",
            "user_category_attendances",
            "user_category_attendance_rate"
        ])

    regs = registrations.copy()
    events_small = events[["id", "category"]].copy()

    regs["event_id"] = regs["event_id"].apply(normalize_id)
    regs["user_id"] = regs["user_id"].apply(normalize_id)
    regs["attendance_status"] = regs["attendance_status"].fillna("").astype(str)
    regs["status"] = regs["status"].fillna("").astype(str)

    events_small["id"] = events_small["id"].apply(normalize_id)
    events_small["category"] = events_small["category"].fillna("Autre").astype(str)

    merged = regs.merge(
        events_small,
        left_on="event_id",
        right_on="id",
        how="left"
    )

    merged = merged[
        ~merged["status"].isin(CANCELLED_REGISTRATION_VALUES)
    ].copy()

    merged["is_present"] = merged["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES).astype(int)

    grouped = merged.groupby(["user_id", "category"]).agg(
        user_category_registrations=("event_id", "count"),
        user_category_attendances=("is_present", "sum")
    ).reset_index()

    grouped["user_category_attendance_rate"] = (
        grouped["user_category_attendances"] / grouped["user_category_registrations"].replace(0, np.nan)
    ).fillna(0)

    return grouped


def build_feedback_pair_map(feedbacks: pd.DataFrame) -> pd.DataFrame:
    if feedbacks.empty:
        return pd.DataFrame(columns=[
            "user_id",
            "event_id",
            "feedback_rating",
            "has_feedback"
        ])

    feedbacks = feedbacks.copy()
    feedbacks["user_id"] = feedbacks["user_id"].apply(normalize_id)
    feedbacks["event_id"] = feedbacks["event_id"].apply(normalize_id)
    feedbacks["rating"] = safe_numeric(feedbacks["rating"])

    grouped = feedbacks.groupby(["user_id", "event_id"]).agg(
        feedback_rating=("rating", "mean"),
        has_feedback=("rating", "count")
    ).reset_index()

    grouped["has_feedback"] = (grouped["has_feedback"] > 0).astype(int)

    return grouped


def build_invitation_features(invitations: pd.DataFrame) -> pd.DataFrame:
    if invitations.empty:
        return pd.DataFrame(columns=[
            "user_id",
            "event_id",
            "was_invited",
            "rsvp_yes",
            "rsvp_maybe",
            "rsvp_no"
        ])

    invitations = invitations.copy()
    invitations["user_id"] = invitations["user_id"].apply(normalize_id)
    invitations["event_id"] = invitations["event_id"].apply(normalize_id)
    invitations["rsvp_response"] = invitations["rsvp_response"].fillna("").astype(str).str.upper()

    invitations["was_invited"] = 1
    invitations["rsvp_yes"] = (invitations["rsvp_response"] == "YES").astype(int)
    invitations["rsvp_maybe"] = (invitations["rsvp_response"] == "MAYBE").astype(int)
    invitations["rsvp_no"] = (invitations["rsvp_response"] == "NO").astype(int)

    grouped = invitations.groupby(["user_id", "event_id"]).agg(
        was_invited=("was_invited", "max"),
        rsvp_yes=("rsvp_yes", "max"),
        rsvp_maybe=("rsvp_maybe", "max"),
        rsvp_no=("rsvp_no", "max")
    ).reset_index()

    return grouped


def compute_target_score(row: pd.Series) -> float:
    status = str(row.get("status", "")).upper()
    attendance_status = str(row.get("attendance_status", "")).upper()
    feedback_rating = row.get("feedback_rating", 0)

    if status in CANCELLED_REGISTRATION_VALUES:
        return -1.0

    if attendance_status in ABSENT_ATTENDANCE_VALUES:
        return -1.0

    if attendance_status in PRESENT_ATTENDANCE_VALUES:
        if feedback_rating >= 4:
            return 3.0
        return 2.0

    if status == "REGISTERED":
        return 1.0

    return 0.0


def compute_interest_match(user_id: str, category: str, user_interest_map: dict[str, set[str]]) -> int:
    user_codes = user_interest_map.get(user_id, set())
    expected_codes = set(CATEGORY_TO_INTEREST_CODES.get(category, []))

    if not expected_codes:
        return 0

    return int(len(user_codes.intersection(expected_codes)) > 0)


def create_pair_rows(
    base_pairs: pd.DataFrame,
    users: pd.DataFrame,
    events: pd.DataFrame,
    user_interest_map: dict[str, set[str]],
    event_agg: pd.DataFrame,
    user_history: pd.DataFrame,
    user_category_history: pd.DataFrame,
    feedback_pairs: pd.DataFrame,
    invitation_features: pd.DataFrame,
    user_points: pd.DataFrame,
    user_badges: pd.DataFrame,
    reference_date: pd.Timestamp,
    data_source: str,
    sample_weight: float
) -> pd.DataFrame:
    users_small = users.copy()
    events_small = events.copy()

    users_small["id"] = users_small["id"].apply(normalize_id)
    events_small["id"] = events_small["id"].apply(normalize_id)

    pairs = base_pairs.copy()
    pairs["user_id"] = pairs["user_id"].apply(normalize_id)
    pairs["event_id"] = pairs["event_id"].apply(normalize_id)

    dataset = pairs.merge(
        users_small.add_prefix("user_"),
        left_on="user_id",
        right_on="user_id",
        how="left"
    )

    dataset = dataset.merge(
        events_small.add_prefix("event_"),
        left_on="event_id",
        right_on="event_id",
        how="left"
    )

    dataset = dataset.merge(event_agg, on="event_id", how="left")
    dataset = dataset.merge(user_history, on="user_id", how="left")
    dataset = dataset.merge(user_points, on="user_id", how="left")
    dataset = dataset.merge(user_badges, on="user_id", how="left")
    dataset = dataset.merge(feedback_pairs, on=["user_id", "event_id"], how="left")
    dataset = dataset.merge(invitation_features, on=["user_id", "event_id"], how="left")

    dataset["event_category"] = dataset["event_category"].fillna("Autre").astype(str)

    dataset = dataset.merge(
        user_category_history,
        left_on=["user_id", "event_category"],
        right_on=["user_id", "category"],
        how="left"
    )

    dataset["event_start_at"] = parse_datetime(dataset["event_start_at"])
    dataset["event_registration_deadline"] = parse_datetime(dataset["event_registration_deadline"])

    dataset["event_day_of_week"] = dataset["event_start_at"].dt.dayofweek.fillna(-1).astype(int)
    dataset["event_hour"] = dataset["event_start_at"].dt.hour.fillna(-1).astype(int)
    dataset["days_until_event"] = (
        dataset["event_start_at"] - reference_date
    ).dt.days.fillna(0).astype(int)

    dataset["event_capacity"] = safe_numeric(dataset["event_capacity"], default=0)
    dataset["event_duration_minutes"] = safe_numeric(dataset["event_duration_minutes"], default=0)

    for column in [
        "event_registered_count",
        "event_present_count",
        "event_avg_rating",
        "event_feedback_count",
        "user_total_registrations",
        "user_total_attendances",
        "user_attendance_rate",
        "user_avg_rating",
        "points_total",
        "points_events_count",
        "badges_count",
        "feedback_rating",
        "has_feedback",
        "was_invited",
        "rsvp_yes",
        "rsvp_maybe",
        "rsvp_no",
        "user_category_registrations",
        "user_category_attendances",
        "user_category_attendance_rate"
    ]:
        if column not in dataset.columns:
            dataset[column] = 0
        dataset[column] = safe_numeric(dataset[column], default=0)

    dataset["event_fill_rate"] = (
        dataset["event_registered_count"] / dataset["event_capacity"].replace(0, np.nan)
    ).fillna(0)

    dataset["same_department"] = (
        safe_numeric(dataset["user_department_id"], default=-1).astype(int)
        ==
        safe_numeric(dataset["event_target_department_id"], default=-2).astype(int)
    ).astype(int)

    dataset["is_global_event"] = (
        dataset["event_audience"].fillna("").astype(str).str.upper() == "GLOBAL"
    ).astype(int)

    dataset["interest_match"] = dataset.apply(
        lambda row: compute_interest_match(
            user_id=row["user_id"],
            category=row["event_category"],
            user_interest_map=user_interest_map
        ),
        axis=1
    )

    dataset["data_source"] = data_source
    dataset["sample_weight"] = sample_weight

    output_columns = [
        "user_id",
        "event_id",
        "data_source",
        "sample_weight",

        "event_category",
        "event_audience",
        "event_location_type",
        "event_status",
        "event_capacity",
        "event_duration_minutes",
        "event_day_of_week",
        "event_hour",
        "days_until_event",
        "event_registered_count",
        "event_present_count",
        "event_fill_rate",
        "event_avg_rating",
        "event_feedback_count",

        "same_department",
        "is_global_event",
        "interest_match",

        "user_total_registrations",
        "user_total_attendances",
        "user_attendance_rate",
        "user_avg_rating",
        "user_category_registrations",
        "user_category_attendances",
        "user_category_attendance_rate",
        "points_total",
        "points_events_count",
        "badges_count",

        "was_invited",
        "rsvp_yes",
        "rsvp_maybe",
        "rsvp_no",

        "registered",
        "attended",
        "feedback_rating",
        "has_feedback",
        "target_score"
    ]

    for column in output_columns:
        if column not in dataset.columns:
            dataset[column] = 0

    return dataset[output_columns]


def main() -> None:
    config = load_config()

    input_dir = Path(config["input_dir"])
    output_file = Path(config["output_file"])
    output_file.parent.mkdir(parents=True, exist_ok=True)

    random_state = int(config.get("random_state", 42))
    rng = np.random.default_rng(random_state)

    reference_date = pd.Timestamp(config["reference_date"], tz="UTC")

    users = read_csv_if_exists(input_dir / "users.csv")
    events = read_csv_if_exists(input_dir / "events.csv")
    registrations = read_csv_if_exists(input_dir / "event_registrations.csv")
    feedbacks = read_csv_if_exists(input_dir / "event_feedbacks.csv")
    invitations = read_csv_if_exists(input_dir / "event_invitations.csv")
    interests = read_csv_if_exists(input_dir / "interests.csv")
    user_interests = read_csv_if_exists(input_dir / "user_interests.csv")
    points = read_csv_if_exists(input_dir / "points_transactions.csv")
    badges = read_csv_if_exists(input_dir / "user_badges.csv")

    if users.empty or events.empty:
        raise RuntimeError("users.csv et events.csv sont obligatoires.")

    users["id"] = users["id"].apply(normalize_id)
    events["id"] = events["id"].apply(normalize_id)

    if not registrations.empty:
        registrations["user_id"] = registrations["user_id"].apply(normalize_id)
        registrations["event_id"] = registrations["event_id"].apply(normalize_id)
        registrations["status"] = registrations["status"].fillna("").astype(str).str.upper()
        registrations["attendance_status"] = registrations["attendance_status"].fillna("").astype(str).str.upper()

    user_interest_map = build_user_interest_map(user_interests, interests)
    event_agg = build_event_aggregates(registrations, feedbacks)
    user_history = build_user_history(registrations, feedbacks, events)
    user_category_history = build_user_category_history(registrations, events)
    feedback_pairs = build_feedback_pair_map(feedbacks)
    invitation_features = build_invitation_features(invitations)
    user_points = build_user_points(points)
    user_badges = build_user_badges(badges)

    print("[INFO] Construction des interactions positives...")

    positive_pairs = registrations.copy()
    positive_pairs["registered"] = (
        ~positive_pairs["status"].isin(CANCELLED_REGISTRATION_VALUES)
    ).astype(int)
    positive_pairs["attended"] = (
        positive_pairs["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES)
    ).astype(int)

    positive_pairs = positive_pairs.merge(
        feedback_pairs,
        on=["user_id", "event_id"],
        how="left"
    )

    positive_pairs["feedback_rating"] = safe_numeric(positive_pairs["feedback_rating"], default=0)
    positive_pairs["has_feedback"] = safe_numeric(positive_pairs["has_feedback"], default=0)
    positive_pairs["target_score"] = positive_pairs.apply(compute_target_score, axis=1)

    positive_pairs = positive_pairs[
        [
            "user_id",
            "event_id",
            "status",
            "attendance_status",
            "registered",
            "attended",
            "feedback_rating",
            "has_feedback",
            "target_score"
        ]
    ].drop_duplicates(subset=["user_id", "event_id"])

    print(f"[INFO] Interactions positives / connues: {len(positive_pairs)}")

    print("[INFO] Construction des exemples négatifs...")

    all_event_ids = events["id"].dropna().astype(str).unique().tolist()
    interacted_by_user = positive_pairs.groupby("user_id")["event_id"].apply(set).to_dict()

    negative_rows = []
    negative_ratio = int(config.get("negative_sample_ratio", 3))
    min_negative = int(config.get("min_negative_samples_per_user", 5))

    for user_id in users["id"].dropna().astype(str).unique():
        interacted_events = interacted_by_user.get(user_id, set())
        candidate_events = [event_id for event_id in all_event_ids if event_id not in interacted_events]

        if not candidate_events:
            continue

        positive_count = len(interacted_events)
        sample_size = max(min_negative, positive_count * negative_ratio)
        sample_size = min(sample_size, len(candidate_events))

        sampled_events = rng.choice(candidate_events, size=sample_size, replace=False)

        for event_id in sampled_events:
            negative_rows.append({
                "user_id": user_id,
                "event_id": event_id,
                "status": "IGNORED",
                "attendance_status": "",
                "registered": 0,
                "attended": 0,
                "feedback_rating": 0,
                "has_feedback": 0,
                "target_score": 0.0
            })

    negative_pairs = pd.DataFrame(negative_rows)

    print(f"[INFO] Exemples négatifs: {len(negative_pairs)}")

    known_dataset = create_pair_rows(
        base_pairs=positive_pairs,
        users=users,
        events=events,
        user_interest_map=user_interest_map,
        event_agg=event_agg,
        user_history=user_history,
        user_category_history=user_category_history,
        feedback_pairs=feedback_pairs,
        invitation_features=invitation_features,
        user_points=user_points,
        user_badges=user_badges,
        reference_date=reference_date,
        data_source="CAPEVENTS_CLEAN",
        sample_weight=1.0
    )

    negative_dataset = create_pair_rows(
        base_pairs=negative_pairs,
        users=users,
        events=events,
        user_interest_map=user_interest_map,
        event_agg=event_agg,
        user_history=user_history,
        user_category_history=user_category_history,
        feedback_pairs=feedback_pairs,
        invitation_features=invitation_features,
        user_points=user_points,
        user_badges=user_badges,
        reference_date=reference_date,
        data_source="CAPEVENTS_NEGATIVE_SAMPLED",
        sample_weight=0.35
    )

    final_dataset = pd.concat(
        [known_dataset, negative_dataset],
        ignore_index=True
    )

    final_dataset = final_dataset.sample(
        frac=1,
        random_state=random_state
    ).reset_index(drop=True)

    final_dataset.to_csv(output_file, index=False, encoding="utf-8")

    print("\n=== Recommendation dataset created ===")
    print(f"Output: {output_file}")
    print(f"Rows: {len(final_dataset)}")
    print("\nTarget distribution:")
    print(final_dataset["target_score"].value_counts().sort_index())


if __name__ == "__main__":
    main()