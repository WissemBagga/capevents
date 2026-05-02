import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from catboost import CatBoostRanker

from app.schemas.recommendation import RecommendationItem, RecommendationResponse

from app.data.runtime_loader import (
    load_runtime_users,
    load_runtime_events,
    load_runtime_registrations,
    load_runtime_feedbacks,
    load_runtime_invitations,
    load_runtime_interests,
    load_runtime_user_interests,
    load_runtime_points,
    load_runtime_badges
)

from uuid import uuid4
from app.services.prediction_logger import PredictionLogger

MODEL_PATH = Path("models_artifacts/recommendation/catboost_recommender.cbm")
FEATURES_PATH = Path("models_artifacts/recommendation/features.json")
RAW_DIR = Path("datasets/raw/capevents")

MODEL_NAME = "catboost_recommender"
MODEL_VERSION = "recommendation-v1.0.0"


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

CANCELLED_REGISTRATION_VALUES = {
    "CANCELLED",
    "UNREGISTERED"
}


def read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def normalize_id(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def safe_numeric(value: Any, default: float = 0.0) -> float:
    try:
        if pd.isna(value):
            return default
        return float(value)
    except Exception:
        return default


def safe_int(value: Any, default: int = 0) -> int:
    return int(safe_numeric(value, default=default))


def parse_datetime_value(value: Any):
    return pd.to_datetime(value, errors="coerce", utc=True)


class RecommendationService:
    def __init__(self) -> None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modèle introuvable: {MODEL_PATH}")

        if not FEATURES_PATH.exists():
            raise FileNotFoundError(f"Fichier features introuvable: {FEATURES_PATH}")

        self.model = CatBoostRanker()
        self.model.load_model(str(MODEL_PATH))

        self.prediction_logger = PredictionLogger()

        with FEATURES_PATH.open("r", encoding="utf-8") as file:
            metadata = json.load(file)

        self.features: list[str] = metadata["features"]
        self.categorical_features: list[str] = metadata.get("categorical_features", [])

        self.reload_data()

    def reload_data(self) -> None:
        self.users = load_runtime_users()
        self.events = load_runtime_events()
        self.registrations = load_runtime_registrations()
        self.feedbacks = load_runtime_feedbacks()
        self.invitations = load_runtime_invitations()
        self.interests = load_runtime_interests()
        self.user_interests = load_runtime_user_interests()
        self.points = load_runtime_points()
        self.badges = load_runtime_badges()

        self._prepare_dataframes()

    def _prepare_dataframes(self) -> None:
        if not self.users.empty:
            self.users["id"] = self.users["id"].apply(normalize_id)

        if not self.events.empty:
            self.events["id"] = self.events["id"].apply(normalize_id)
            self.events["status"] = self.events["status"].fillna("").astype(str).str.upper()
            self.events["category"] = self.events["category"].fillna("Autre").astype(str)
            self.events["audience"] = self.events["audience"].fillna("UNKNOWN").astype(str)
            self.events["location_type"] = self.events["location_type"].fillna("UNKNOWN").astype(str)

        if not self.registrations.empty:
            self.registrations["user_id"] = self.registrations["user_id"].apply(normalize_id)
            self.registrations["event_id"] = self.registrations["event_id"].apply(normalize_id)
            self.registrations["status"] = self.registrations["status"].fillna("").astype(str).str.upper()
            self.registrations["attendance_status"] = (
                self.registrations["attendance_status"].fillna("").astype(str).str.upper()
            )

        if not self.feedbacks.empty:
            self.feedbacks["user_id"] = self.feedbacks["user_id"].apply(normalize_id)
            self.feedbacks["event_id"] = self.feedbacks["event_id"].apply(normalize_id)
            self.feedbacks["rating"] = pd.to_numeric(self.feedbacks["rating"], errors="coerce").fillna(0)

        if not self.invitations.empty:
            self.invitations["user_id"] = self.invitations["user_id"].apply(normalize_id)
            self.invitations["event_id"] = self.invitations["event_id"].apply(normalize_id)
            self.invitations["rsvp_response"] = (
                self.invitations["rsvp_response"].fillna("").astype(str).str.upper()
            )

        if not self.user_interests.empty:
            self.user_interests["user_id"] = self.user_interests["user_id"].apply(normalize_id)
            self.user_interests["interest_id"] = pd.to_numeric(
                self.user_interests["interest_id"], errors="coerce"
            ).fillna(0).astype(int)

        if not self.interests.empty:
            self.interests["id"] = pd.to_numeric(self.interests["id"], errors="coerce").fillna(0).astype(int)
            self.interests["code"] = self.interests["code"].fillna("").astype(str)

        if not self.points.empty:
            self.points["user_id"] = self.points["user_id"].apply(normalize_id)
            self.points["points_delta"] = pd.to_numeric(
                self.points["points_delta"], errors="coerce"
            ).fillna(0)

        if not self.badges.empty:
            self.badges["user_id"] = self.badges["user_id"].apply(normalize_id)

    def recommend_for_user(self, user_id: str, limit: int = 5) -> RecommendationResponse:
        request_id = str(uuid4())
        user_id = normalize_id(user_id)

        user = self._find_user(user_id)
        if user is None:
            self.prediction_logger.log_recommendation(
                request_id=request_id,
                user_id=user_id,
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION,
                total_candidates=0,
                recommendations=[],
                status="USER_NOT_FOUND",
                message="Utilisateur introuvable dans users.csv."
            )

            return RecommendationResponse(
                user_id=user_id,
                total_candidates=0,
                items=[],
                message="Utilisateur introuvable dans users.csv.",
                request_id=request_id,
                model_version=MODEL_VERSION
            )

        candidates = self._build_candidate_rows(user_id=user_id, user=user)

        if candidates.empty:
            self.prediction_logger.log_recommendation(
                request_id=request_id,
                user_id=user_id,
                model_name=MODEL_NAME,
                model_version=MODEL_VERSION,
                total_candidates=0,
                recommendations=[],
                status="NO_CANDIDATES",
                message="Aucun événement candidat disponible pour cet utilisateur."
            )

            return RecommendationResponse(
                user_id=user_id,
                total_candidates=0,
                items=[],
                message="Aucun événement candidat disponible pour cet utilisateur.",
                request_id=request_id,
                model_version=MODEL_VERSION
            )

        prediction_input = self._prepare_prediction_input(candidates)

        predictions = self.model.predict(prediction_input[self.features])
        candidates["score"] = predictions

        ranked = candidates.sort_values("score", ascending=False).head(limit)

        items: list[RecommendationItem] = []
        log_items: list[dict] = []

        for rank, (_, row) in enumerate(ranked.iterrows(), start=1):
            reasons = self._build_reasons(row)

            item = RecommendationItem(
                event_id=str(row["event_id"]),
                title=str(row.get("event_title", "")),
                category=str(row.get("event_category", "")),
                start_at=str(row.get("event_start_at", "")),
                rank=rank,
                score=float(row["score"]),
                reasons=reasons
            )

            items.append(item)

            log_items.append({
                "event_id": item.event_id,
                "title": item.title,
                "category": item.category,
                "rank": item.rank,
                "score": item.score,
                "reasons": item.reasons
            })

        self.prediction_logger.log_recommendation(
            request_id=request_id,
            user_id=user_id,
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            total_candidates=int(len(candidates)),
            recommendations=log_items,
            status="SUCCESS",
            message="Recommendations generated successfully."
        )

        return RecommendationResponse(
            user_id=user_id,
            total_candidates=int(len(candidates)),
            items=items,
            message="Recommendations generated successfully.",
            request_id=request_id,
            model_version=MODEL_VERSION
        )

    def _find_user(self, user_id: str) -> pd.Series | None:
        if self.users.empty:
            return None

        user_rows = self.users[self.users["id"].astype(str) == user_id]

        if user_rows.empty:
            return None

        return user_rows.iloc[0]

    def _get_registered_event_ids(self, user_id: str) -> set[str]:
        if self.registrations.empty:
            return set()

        user_regs = self.registrations[
            self.registrations["user_id"].astype(str) == user_id
        ].copy()

        user_regs = user_regs[
            ~user_regs["status"].isin(CANCELLED_REGISTRATION_VALUES)
        ]

        return set(user_regs["event_id"].astype(str).tolist())

    def _build_candidate_rows(self, user_id: str, user: pd.Series) -> pd.DataFrame:
        if self.events.empty:
            return pd.DataFrame()

        registered_event_ids = self._get_registered_event_ids(user_id)

        events = self.events.copy()

        # On recommande en priorité les événements publiés.
        published_events = events[events["status"] == "PUBLISHED"].copy()

        if published_events.empty:
            return pd.DataFrame()

        candidates = published_events[
            ~published_events["id"].astype(str).isin(registered_event_ids)
        ].copy()

        if candidates.empty:
            return pd.DataFrame()

        user_interest_codes = self._get_user_interest_codes(user_id)
        user_history = self._get_user_history(user_id)
        user_points = self._get_user_points(user_id)
        user_badges = self._get_user_badges(user_id)

        rows: list[dict] = []

        now = pd.Timestamp.now(tz="UTC")

        for _, event in candidates.iterrows():
            event_id = normalize_id(event["id"])
            category = str(event.get("category", "Autre"))

            event_stats = self._get_event_stats(event_id)
            category_history = self._get_user_category_history(user_id, category)
            invitation_stats = self._get_invitation_features(user_id, event_id)

            start_at = parse_datetime_value(event.get("start_at"))
            registration_deadline = parse_datetime_value(event.get("registration_deadline"))

            if pd.isna(start_at):
                event_day_of_week = -1
                event_hour = -1
                days_until_event = 0
                start_at_str = ""
            else:
                event_day_of_week = int(start_at.dayofweek)
                event_hour = int(start_at.hour)
                days_until_event = int((start_at - now).days)
                start_at_str = start_at.isoformat()

            if pd.isna(registration_deadline):
                days_until_deadline = 999
                is_deadline_passed = 0
            else:
                days_until_deadline = int((registration_deadline - now).days)
                is_deadline_passed = int(registration_deadline < now)

            event_capacity = safe_int(event.get("capacity"), default=0)
            event_registered_count = event_stats["event_registered_count"]

            event_remaining_capacity = (
                max(event_capacity - event_registered_count, 0)
                if event_capacity > 0
                else 0
            )

            is_full = int(event_capacity > 0 and event_remaining_capacity == 0)

            event_fill_rate = (
                event_registered_count / event_capacity
                if event_capacity > 0
                else 0.0
            )

            user_department_id = safe_int(user.get("department_id"), default=-1)
            target_department_id = safe_int(event.get("target_department_id"), default=-2)

            same_department = int(
                target_department_id > 0 and user_department_id == target_department_id
            )

            is_global_event = int(str(event.get("audience", "")).upper() == "GLOBAL")

            expected_interests = set(CATEGORY_TO_INTEREST_CODES.get(category, []))
            interest_match = int(len(user_interest_codes.intersection(expected_interests)) > 0)

            row = {
                "user_id": user_id,
                "event_id": event_id,

                "event_title": str(event.get("title", "")),
                "event_start_at": start_at_str,
                "event_registration_deadline": str(event.get("registration_deadline", "")),

                "event_category": category,
                "event_audience": str(event.get("audience", "UNKNOWN")),
                "event_location_type": str(event.get("location_type", "UNKNOWN")),
                "event_status": str(event.get("status", "UNKNOWN")),
                "event_capacity": event_capacity,
                "event_duration_minutes": safe_int(event.get("duration_minutes"), default=0),
                "event_day_of_week": event_day_of_week,
                "event_hour": event_hour,
                "days_until_event": days_until_event,

                "days_until_deadline": days_until_deadline,
                "is_deadline_passed": is_deadline_passed,
                "is_full": is_full,
                "event_remaining_capacity": event_remaining_capacity,

                "event_registered_count": event_registered_count,
                "event_present_count": event_stats["event_present_count"],
                "event_fill_rate": event_fill_rate,
                "event_avg_rating": event_stats["event_avg_rating"],
                "event_feedback_count": event_stats["event_feedback_count"],

                "same_department": same_department,
                "is_global_event": is_global_event,
                "interest_match": interest_match,

                "user_total_registrations": user_history["user_total_registrations"],
                "user_total_attendances": user_history["user_total_attendances"],
                "user_attendance_rate": user_history["user_attendance_rate"],
                "user_avg_rating": user_history["user_avg_rating"],

                "user_category_registrations": category_history["user_category_registrations"],
                "user_category_attendances": category_history["user_category_attendances"],
                "user_category_attendance_rate": category_history["user_category_attendance_rate"],

                "points_total": user_points["points_total"],
                "points_events_count": user_points["points_events_count"],
                "badges_count": user_badges["badges_count"],

                "was_invited": invitation_stats["was_invited"],
                "rsvp_yes": invitation_stats["rsvp_yes"],
                "rsvp_maybe": invitation_stats["rsvp_maybe"],
                "rsvp_no": invitation_stats["rsvp_no"]
            }

            rows.append(row)

        candidate_df = pd.DataFrame(rows)

        if candidate_df.empty:
            return candidate_df

        # On évite les recommandations inutiles : complet ou deadline dépassée.
        available_df = candidate_df[
            (candidate_df["is_deadline_passed"] == 0)
            &
            (candidate_df["is_full"] == 0)
        ].copy()

        # Fallback : si les données de test ne contiennent aucun événement disponible,
        # on retourne quand même les candidats pour éviter une réponse vide.
        if available_df.empty:
            return candidate_df

        return available_df

    def _prepare_prediction_input(self, candidates: pd.DataFrame) -> pd.DataFrame:
        df = candidates.copy()

        for feature in self.features:
            if feature not in df.columns:
                df[feature] = "UNKNOWN" if feature in self.categorical_features else 0

        for feature in self.categorical_features:
            if feature in df.columns:
                df[feature] = df[feature].fillna("UNKNOWN").astype(str)

        for feature in self.features:
            if feature not in self.categorical_features:
                df[feature] = pd.to_numeric(df[feature], errors="coerce").fillna(0)

        return df

    def _get_event_stats(self, event_id: str) -> dict:
        registered_count = 0
        present_count = 0
        avg_rating = 0.0
        feedback_count = 0

        if not self.registrations.empty:
            event_regs = self.registrations[
                self.registrations["event_id"].astype(str) == event_id
            ].copy()

            event_regs = event_regs[
                ~event_regs["status"].isin(CANCELLED_REGISTRATION_VALUES)
            ]

            registered_count = int(len(event_regs))
            present_count = int(event_regs["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES).sum())

        if not self.feedbacks.empty:
            event_feedbacks = self.feedbacks[
                self.feedbacks["event_id"].astype(str) == event_id
            ]

            feedback_count = int(len(event_feedbacks))
            if feedback_count > 0:
                avg_rating = float(event_feedbacks["rating"].mean())

        return {
            "event_registered_count": registered_count,
            "event_present_count": present_count,
            "event_avg_rating": avg_rating,
            "event_feedback_count": feedback_count
        }

    def _get_user_history(self, user_id: str) -> dict:
        if self.registrations.empty:
            return {
                "user_total_registrations": 0,
                "user_total_attendances": 0,
                "user_attendance_rate": 0.0,
                "user_avg_rating": 0.0
            }

        user_regs = self.registrations[
            self.registrations["user_id"].astype(str) == user_id
        ].copy()

        user_regs = user_regs[
            ~user_regs["status"].isin(CANCELLED_REGISTRATION_VALUES)
        ]

        total_registrations = int(len(user_regs))
        total_attendances = int(user_regs["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES).sum())

        attendance_rate = (
            total_attendances / total_registrations
            if total_registrations > 0
            else 0.0
        )

        avg_rating = 0.0

        if not self.feedbacks.empty:
            user_feedbacks = self.feedbacks[
                self.feedbacks["user_id"].astype(str) == user_id
            ]
            if not user_feedbacks.empty:
                avg_rating = float(user_feedbacks["rating"].mean())

        return {
            "user_total_registrations": total_registrations,
            "user_total_attendances": total_attendances,
            "user_attendance_rate": attendance_rate,
            "user_avg_rating": avg_rating
        }

    def _get_user_category_history(self, user_id: str, category: str) -> dict:
        if self.registrations.empty or self.events.empty:
            return {
                "user_category_registrations": 0,
                "user_category_attendances": 0,
                "user_category_attendance_rate": 0.0
            }

        user_regs = self.registrations[
            self.registrations["user_id"].astype(str) == user_id
        ].copy()

        user_regs = user_regs[
            ~user_regs["status"].isin(CANCELLED_REGISTRATION_VALUES)
        ]

        if user_regs.empty:
            return {
                "user_category_registrations": 0,
                "user_category_attendances": 0,
                "user_category_attendance_rate": 0.0
            }

        event_categories = self.events[["id", "category"]].copy()
        event_categories["id"] = event_categories["id"].astype(str)

        merged = user_regs.merge(
            event_categories,
            left_on="event_id",
            right_on="id",
            how="left"
        )

        category_rows = merged[merged["category"].astype(str) == str(category)]

        total = int(len(category_rows))
        attended = int(category_rows["attendance_status"].isin(PRESENT_ATTENDANCE_VALUES).sum())

        rate = attended / total if total > 0 else 0.0

        return {
            "user_category_registrations": total,
            "user_category_attendances": attended,
            "user_category_attendance_rate": rate
        }

    def _get_invitation_features(self, user_id: str, event_id: str) -> dict:
        result = {
            "was_invited": 0,
            "rsvp_yes": 0,
            "rsvp_maybe": 0,
            "rsvp_no": 0
        }

        if self.invitations.empty:
            return result

        rows = self.invitations[
            (self.invitations["user_id"].astype(str) == user_id)
            &
            (self.invitations["event_id"].astype(str) == event_id)
        ]

        if rows.empty:
            return result

        responses = set(rows["rsvp_response"].astype(str).str.upper().tolist())

        result["was_invited"] = 1
        result["rsvp_yes"] = int("YES" in responses)
        result["rsvp_maybe"] = int("MAYBE" in responses)
        result["rsvp_no"] = int("NO" in responses)

        return result

    def _get_user_interest_codes(self, user_id: str) -> set[str]:
        if self.user_interests.empty or self.interests.empty:
            return set()

        rows = self.user_interests[
            self.user_interests["user_id"].astype(str) == user_id
        ]

        if rows.empty:
            return set()

        interest_ids = set(rows["interest_id"].astype(int).tolist())

        interest_rows = self.interests[
            self.interests["id"].astype(int).isin(interest_ids)
        ]

        return set(interest_rows["code"].astype(str).tolist())

    def _get_user_points(self, user_id: str) -> dict:
        if self.points.empty:
            return {
                "points_total": 0,
                "points_events_count": 0
            }

        rows = self.points[
            self.points["user_id"].astype(str) == user_id
        ]

        return {
            "points_total": float(rows["points_delta"].sum()) if not rows.empty else 0.0,
            "points_events_count": int(rows["event_id"].nunique()) if not rows.empty and "event_id" in rows.columns else 0
        }

    def _get_user_badges(self, user_id: str) -> dict:
        if self.badges.empty:
            return {"badges_count": 0}

        rows = self.badges[
            self.badges["user_id"].astype(str) == user_id
        ]

        return {
            "badges_count": int(rows["badge_code"].nunique()) if not rows.empty else 0
        }

    def _build_reasons(self, row: pd.Series) -> list[str]:
        reasons: list[str] = []

        category = str(row.get("event_category", "cet événement"))

        if int(row.get("interest_match", 0)) == 1:
            reasons.append(f"Correspond à vos centres d’intérêt liés à {category}.")

        if int(row.get("same_department", 0)) == 1:
            reasons.append("Adapté à votre département.")

        if int(row.get("is_global_event", 0)) == 1:
            reasons.append("Ouvert à tous les collaborateurs.")

        if int(row.get("rsvp_yes", 0)) == 1:
            reasons.append("Vous avez déjà répondu positivement à cette invitation.")

        elif int(row.get("rsvp_maybe", 0)) == 1:
            reasons.append("Vous avez montré un intérêt possible pour cet événement.")

        elif int(row.get("was_invited", 0)) == 1:
            reasons.append("Vous avez été invité à cet événement.")

        if float(row.get("user_category_attendance_rate", 0)) >= 0.6:
            reasons.append(f"Vous participez souvent aux événements de type {category}.")

        if float(row.get("event_avg_rating", 0)) >= 4:
            reasons.append("Événement similaire bien noté par les participants.")

        fill_rate = float(row.get("event_fill_rate", 0))
        if 0.2 <= fill_rate < 0.85:
            reasons.append("Événement déjà attractif avec des places encore disponibles.")

        remaining_capacity = int(row.get("event_remaining_capacity", 0))
        if remaining_capacity > 0:
            reasons.append(f"{remaining_capacity} place(s) encore disponible(s).")

        days_until_event = int(row.get("days_until_event", 0))
        if 0 <= days_until_event <= 14:
            reasons.append("Événement prévu prochainement.")

        if float(row.get("points_total", 0)) >= 300:
            reasons.append("Votre activité sur la plateforme indique un profil engagé.")

        if not reasons:
            reasons.append("Profil compatible avec cet événement selon le modèle IA.")

        # On limite à 3 raisons pour garder une carte lisible côté Angular.
        return reasons[:3]