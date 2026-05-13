import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from training.build_recommendation_dataset import (
    build_event_aggregates,
    build_feedback_pair_map,
    build_invitation_features,
    build_invitation_reminder_features,
    build_user_badges,
    build_user_category_history,
    build_user_history,
    build_user_interest_map,
    build_user_points,
    create_pair_rows,
    normalize_id,
    read_csv_if_exists,
)


CONFIG_PATH = Path("configs/recommendation_dataset_config.json")
DATASET_PATH = Path("datasets/processed/recommendation_train.csv")
OUTPUT_PATH = Path("datasets/processed/recommendation_train_hard_negatives.csv")


NEGATIVE_STATUS_VALUES = {"NO", "PENDING", "EXPIRED"}


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def build_interacted_pairs(registrations: pd.DataFrame) -> set[tuple[str, str]]:
    if registrations.empty:
        return set()

    regs = registrations.copy()
    regs["user_id"] = regs["user_id"].apply(normalize_id)
    regs["event_id"] = regs["event_id"].apply(normalize_id)

    return set(zip(regs["user_id"], regs["event_id"]))


def build_invitation_hard_negatives(
    invitations: pd.DataFrame,
    interacted_pairs: set[tuple[str, str]],
) -> pd.DataFrame:
    if invitations.empty:
        return pd.DataFrame()

    inv = invitations.copy()
    inv["user_id"] = inv["user_id"].apply(normalize_id)
    inv["event_id"] = inv["event_id"].apply(normalize_id)
    inv["status"] = inv["status"].fillna("").astype(str).str.upper()
    inv["rsvp_response"] = inv["rsvp_response"].fillna("").astype(str).str.upper()

    hard = inv[
        (
            (inv["rsvp_response"] == "NO")
            | (inv["status"].isin(["PENDING", "EXPIRED"]))
        )
    ].copy()

    if hard.empty:
        return pd.DataFrame()

    hard = hard[
        ~hard.apply(
            lambda row: (row["user_id"], row["event_id"]) in interacted_pairs,
            axis=1,
        )
    ].copy()

    if hard.empty:
        return pd.DataFrame()

    hard = hard[["user_id", "event_id"]].drop_duplicates()
    hard["status"] = "HARD_NEGATIVE_INVITATION"
    hard["attendance_status"] = ""
    hard["registered"] = 0
    hard["attended"] = 0
    hard["feedback_rating"] = 0
    hard["has_feedback"] = 0
    hard["target_score"] = 0.0

    return hard


def build_same_department_hard_negatives(
    users: pd.DataFrame,
    events: pd.DataFrame,
    interacted_pairs: set[tuple[str, str]],
    max_per_user: int = 5,
    random_state: int = 42,
) -> pd.DataFrame:
    if users.empty or events.empty:
        return pd.DataFrame()

    rng = np.random.default_rng(random_state)

    users_df = users.copy()
    events_df = events.copy()

    users_df["id"] = users_df["id"].apply(normalize_id)
    events_df["id"] = events_df["id"].apply(normalize_id)

    users_df["department_id"] = pd.to_numeric(
        users_df["department_id"],
        errors="coerce",
    ).fillna(-1).astype(int)

    events_df["target_department_id"] = pd.to_numeric(
        events_df["target_department_id"],
        errors="coerce",
    ).fillna(-2).astype(int)

    events_df["status"] = events_df["status"].fillna("").astype(str).str.upper()
    events_df["audience"] = events_df["audience"].fillna("").astype(str).str.upper()

    department_events = events_df[
        (events_df["status"] == "PUBLISHED")
        & (events_df["audience"] == "DEPARTMENT")
        & (events_df["target_department_id"] > 0)
    ].copy()

    if department_events.empty:
        return pd.DataFrame()

    rows = []

    for _, user in users_df.iterrows():
        user_id = user["id"]
        department_id = int(user["department_id"])

        if department_id <= 0:
            continue

        candidates = department_events[
            department_events["target_department_id"] == department_id
        ]["id"].astype(str).tolist()

        candidates = [
            event_id
            for event_id in candidates
            if (user_id, event_id) not in interacted_pairs
        ]

        if not candidates:
            continue

        sample_size = min(max_per_user, len(candidates))
        sampled = rng.choice(candidates, size=sample_size, replace=False)

        for event_id in sampled:
            rows.append({
                "user_id": user_id,
                "event_id": event_id,
                "status": "HARD_NEGATIVE_SAME_DEPARTMENT",
                "attendance_status": "",
                "registered": 0,
                "attended": 0,
                "feedback_rating": 0,
                "has_feedback": 0,
                "target_score": 0.0,
            })

    return pd.DataFrame(rows).drop_duplicates(subset=["user_id", "event_id"])


def main() -> None:
    config = load_config()
    input_dir = Path(config["input_dir"])
    reference_date = pd.Timestamp(config["reference_date"], tz="UTC")
    random_state = int(config.get("random_state", 42))

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset de base introuvable: {DATASET_PATH}. "
            "Lance d'abord: python -m training.build_recommendation_dataset"
        )

    base_dataset = pd.read_csv(DATASET_PATH)

    users = read_csv_if_exists(input_dir / "users.csv")
    events = read_csv_if_exists(input_dir / "events.csv")
    registrations = read_csv_if_exists(input_dir / "event_registrations.csv")
    feedbacks = read_csv_if_exists(input_dir / "event_feedbacks.csv")
    invitations = read_csv_if_exists(input_dir / "event_invitations.csv")
    interests = read_csv_if_exists(input_dir / "interests.csv")
    user_interests = read_csv_if_exists(input_dir / "user_interests.csv")
    points = read_csv_if_exists(input_dir / "points_transactions.csv")
    badges = read_csv_if_exists(input_dir / "user_badges.csv")
    reminders = read_csv_if_exists(input_dir / "event_invitation_reminders.csv")

    if users.empty or events.empty:
        raise RuntimeError("users.csv et events.csv sont obligatoires.")

    users["id"] = users["id"].apply(normalize_id)
    events["id"] = events["id"].apply(normalize_id)

    if not registrations.empty:
        registrations["user_id"] = registrations["user_id"].apply(normalize_id)
        registrations["event_id"] = registrations["event_id"].apply(normalize_id)
        registrations["status"] = registrations["status"].fillna("").astype(str).str.upper()
        registrations["attendance_status"] = registrations["attendance_status"].fillna("").astype(str).str.upper()

    interacted_pairs = build_interacted_pairs(registrations)

    user_interest_map = build_user_interest_map(user_interests, interests)
    event_agg = build_event_aggregates(registrations, feedbacks)
    user_history = build_user_history(registrations, feedbacks, events)
    user_category_history = build_user_category_history(registrations, events)
    feedback_pairs = build_feedback_pair_map(feedbacks)
    invitation_features = build_invitation_features(invitations)
    reminder_pairs, user_reminders, event_reminders = build_invitation_reminder_features(
        reminders=reminders,
        invitations=invitations,
        reference_date=reference_date,
    )
    user_points = build_user_points(points)
    user_badges = build_user_badges(badges)

    invitation_hard = build_invitation_hard_negatives(
        invitations=invitations,
        interacted_pairs=interacted_pairs,
    )

    same_department_hard = build_same_department_hard_negatives(
        users=users,
        events=events,
        interacted_pairs=interacted_pairs,
        max_per_user=5,
        random_state=random_state,
    )

    hard_pairs = pd.concat(
        [invitation_hard, same_department_hard],
        ignore_index=True,
    )

    if hard_pairs.empty:
        print("[WARN] Aucun hard negative généré.")
        base_dataset.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")
        return

    hard_pairs = hard_pairs.drop_duplicates(subset=["user_id", "event_id"])

    hard_dataset = create_pair_rows(
        base_pairs=hard_pairs,
        users=users,
        events=events,
        user_interest_map=user_interest_map,
        event_agg=event_agg,
        user_history=user_history,
        user_category_history=user_category_history,
        feedback_pairs=feedback_pairs,
        invitation_features=invitation_features,
        reminder_pairs=reminder_pairs,
        user_reminders=user_reminders,
        event_reminders=event_reminders,
        user_points=user_points,
        user_badges=user_badges,
        reference_date=reference_date,
        data_source="CAPEVENTS_HARD_NEGATIVE",
        sample_weight=0.65,
    )

    combined = pd.concat(
        [base_dataset, hard_dataset],
        ignore_index=True,
    )

    combined = combined.drop_duplicates(
        subset=["user_id", "event_id", "data_source"],
        keep="first",
    )

    combined = combined.sample(
        frac=1,
        random_state=random_state,
    ).reset_index(drop=True)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(OUTPUT_PATH, index=False, encoding="utf-8")

    print("\n=== Hard negatives augmentation finished ===")
    print(f"Base rows: {len(base_dataset)}")
    print(f"Invitation hard negatives: {len(invitation_hard)}")
    print(f"Same department hard negatives: {len(same_department_hard)}")
    print(f"Hard dataset rows: {len(hard_dataset)}")
    print(f"Output rows: {len(combined)}")
    print(f"Output: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()