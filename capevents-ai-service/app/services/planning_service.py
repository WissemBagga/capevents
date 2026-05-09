from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd

from app.schemas.planning import (
    PlanningSuggestionRequest,
    PlanningSuggestionResponse,
    PlanningSlotSuggestion,
    PlanningEventProposalRequest,
    PlanningEventProposalResponse,
    PlanningEventProposal
)

from app.data.runtime_loader import (
    load_runtime_events,
    load_runtime_users,
    load_runtime_registrations,
    load_runtime_feedbacks,
    load_runtime_invitations
)

import json
from catboost import CatBoostRegressor

from app.core.model_registry import (
    get_active_model_metadata,
    resolve_registry_path,
    ModelRegistryError
)

from app.services.planning_logger import append_planning_log


DATASET_PATH = Path("datasets/processed/planning_train.csv")

CANDIDATE_HOURS = [9, 10, 11, 14, 15, 16, 18]
WORKING_DAYS = {0, 1, 2, 3, 4}

CANCELLED_REGISTRATION_VALUES = {
    "CANCELLED",
    "UNREGISTERED"
}

PRESENT_ATTENDANCE_VALUES = {
    "PRESENT",
    "ATTENDED",
    "CONFIRMED_PRESENT"
}

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def safe_numeric(value: Any, default: float = 0.0) -> float:
    try:
        if pd.isna(value):
            return default
        return float(value)
    except Exception:
        return default


def parse_start_date(value: str | None) -> datetime:
    if not value:
        return utc_now() + timedelta(days=1)

    parsed = pd.to_datetime(value, errors="coerce", utc=True)

    if pd.isna(parsed):
        return utc_now() + timedelta(days=1)

    return parsed.to_pydatetime()


def clamp_score(value: float) -> float:
    return max(0.0, min(1.0, value))


class PlanningService:
    def __init__(self) -> None:
        self.dataset = self._load_dataset()
        self.planning_model = None
        self.planning_features_payload = None
        self.planning_model_metadata = None
        self._load_planning_model()

    def _load_dataset(self) -> pd.DataFrame:
        if not DATASET_PATH.exists():
            return pd.DataFrame()

        df = pd.read_csv(DATASET_PATH)

        for column in [
            "registration_rate",
            "attendance_rate",
            "success_score",
            "historical_category_registration_rate",
            "historical_category_attendance_rate",
            "historical_department_participation_rate",
            "historical_hour_registration_rate",
            "historical_day_registration_rate"
        ]:
            if column in df.columns:
                df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

        return df

    def suggest_slots(self, payload: PlanningSuggestionRequest) -> PlanningSuggestionResponse:
        request_id = str(uuid4())
        generated_at = utc_now().isoformat()

        candidates = self._generate_candidate_slots(payload)
        candidates = self._calibrate_candidate_scores(candidates)

        ranked = self._select_diverse_slots(candidates, payload.limit)

        items = [
            PlanningSlotSuggestion(
                rank=index,
                start_at=item["start_at"],
                end_at=item["end_at"],
                day_of_week=item["day_of_week"],
                hour=item["hour"],
                score=round(item["score"], 4),
                confidence=item["confidence"],
                reasons=item["reasons"],
                metrics=item["metrics"]
            )
            for index, item in enumerate(ranked, start=1)
        ]

        response = PlanningSuggestionResponse(
            request_id=request_id,
            generated_at=generated_at,
            total_candidates=len(candidates),
            items=items,
            model_info={
                "module": "IA 4 Planning Intelligent",
                "version": (
                    self.planning_model_metadata.get("version")
                    if self.planning_model_metadata
                    else "planning-hybrid-v0.3"
                ),
                "strategy": (
                    "catboost_regressor_plus_business_rules"
                    if self.planning_model is not None
                    else "historical_statistics_plus_business_rules"
                ),
                "trained_model_used": self.planning_model is not None,
                "dataset_path": str(DATASET_PATH)
            }
        )

        try:
            append_planning_log(
                "SLOT_SUGGESTIONS_GENERATED",
                {
                    "request_id": request_id,
                    "category": payload.category,
                    "audience": payload.audience,
                    "location_type": payload.location_type,
                    "target_department_id": payload.target_department_id,
                    "duration_minutes": payload.duration_minutes,
                    "capacity": payload.capacity,
                    "from_date": payload.from_date,
                    "days_horizon": payload.days_horizon,
                    "limit": payload.limit,
                    "total_candidates": response.total_candidates,
                    "returned_items": len(response.items),
                    "model_info": response.model_info
                }
            )
        except Exception:
            # Le monitoring ne doit jamais bloquer la réponse IA.
            pass

        return response

    def _generate_candidate_slots(self, payload: PlanningSuggestionRequest) -> list[dict]:
        start_date = parse_start_date(payload.from_date)
        runtime_events = self._load_runtime_events_safe()

        candidates: list[dict] = []

        for day_offset in range(payload.days_horizon):
            current_day = start_date + timedelta(days=day_offset)

            if current_day.weekday() not in WORKING_DAYS:
                continue

            for hour in CANDIDATE_HOURS:
                slot_start = current_day.replace(hour=hour, minute=0, second=0, microsecond=0)
                slot_end = slot_start + timedelta(minutes=payload.duration_minutes)

                score_payload = self._score_slot(
                    payload=payload,
                    slot_start=slot_start,
                    slot_end=slot_end,
                    runtime_events=runtime_events
                )

                candidates.append({
                    "start_at": slot_start.isoformat(),
                    "end_at": slot_end.isoformat(),
                    "day_of_week": slot_start.weekday(),
                    "hour": hour,
                    **score_payload
                })

        return candidates

    def _load_runtime_events_safe(self) -> pd.DataFrame:
        try:
            events = load_runtime_events()
        except Exception:
            return pd.DataFrame()

        if events.empty:
            return events

        events = events.copy()
        events["start_at_dt"] = pd.to_datetime(events["start_at"], errors="coerce", utc=True)
        events["duration_minutes"] = pd.to_numeric(
            events["duration_minutes"],
            errors="coerce"
        ).fillna(60)
        events["end_at_dt"] = events["start_at_dt"] + pd.to_timedelta(
            events["duration_minutes"],
            unit="m"
        )
        events["target_department_id"] = pd.to_numeric(
            events["target_department_id"],
            errors="coerce"
        ).fillna(0).astype(int)

        return events

    def _score_slot(
        self,
        payload: PlanningSuggestionRequest,
        slot_start: datetime,
        slot_end: datetime,
        runtime_events: pd.DataFrame
    ) -> dict:
        day_of_week = slot_start.weekday()
        hour = slot_start.hour

        history = self._historical_metrics(
            category=payload.category,
            target_department_id=payload.target_department_id,
            day_of_week=day_of_week,
            hour=hour
        )

        conflicts = self._conflict_metrics(
            runtime_events=runtime_events,
            slot_start=slot_start,
            slot_end=slot_end,
            target_department_id=payload.target_department_id
        )

        model_prediction = self._predict_slot_success_score(
            payload=payload,
            slot_start=slot_start,
            runtime_events=runtime_events,
            history=history,
            conflicts=conflicts
        )

        category_hour_score = self._category_hour_score(
            category=payload.category,
            hour=hour
        )

        day_preference_score = self._day_preference_score(day_of_week)

        horizon_score = self._horizon_score(slot_start)

        base_score = (
            0.18 * history["category_registration_rate"]
            + 0.14 * history["category_attendance_rate"]
            + 0.14 * history["hour_registration_rate"]
            + 0.10 * history["day_registration_rate"]
            + 0.12 * history["department_participation_rate"]
            + 0.14 * self._time_preference_score(hour)
            + 0.12 * category_hour_score
            + 0.08 * day_preference_score
            + 0.08 * horizon_score
        )

        conflict_penalty = min(0.30, 0.08 * conflicts["events_same_day_count"])
        department_conflict_penalty = min(0.25, 0.10 * conflicts["department_overlap_count"])

        duration_penalty = 0.0
        if payload.duration_minutes > 180:
            duration_penalty = 0.05

        raw_score = clamp_score(
            base_score
            - conflict_penalty
            - department_conflict_penalty
            - duration_penalty
        )

        # Calibration UX : le score affiché représente un potentiel relatif,
        # pas une probabilité stricte de participation.
        score = clamp_score(0.35 + 0.65 * raw_score)

        hybrid_score = clamp_score(0.35 + 0.65 * raw_score)

        if model_prediction is not None:
            model_score = clamp_score(0.35 + 0.65 * model_prediction)

            score = clamp_score(
                0.70 * model_score
                + 0.30 * hybrid_score
            )

            trained_model_used = True
        else:
            score = hybrid_score
            trained_model_used = False

        return {
            "score": score,
            "confidence": self._confidence_label(history),
            "reasons": self._build_reasons(
                hour=hour,
                history=history,
                conflicts=conflicts,
                score=score
            ),
            "metrics": {
                **history,
                **conflicts,
                "base_score": round(base_score, 4),
                "conflict_penalty": round(conflict_penalty, 4),
                "department_conflict_penalty": round(department_conflict_penalty, 4),
                "duration_penalty": round(duration_penalty, 4),
                "category_hour_score": round(category_hour_score, 4),
                "day_preference_score": round(day_preference_score, 4),
                "horizon_score": round(horizon_score, 4),
                "trained_model_used": trained_model_used,
                "model_prediction": round(model_prediction, 4) if model_prediction is not None else None,
                "hybrid_score": round(hybrid_score, 4),
            }
        }

    def _historical_metrics(
        self,
        category: str,
        target_department_id: int | None,
        day_of_week: int,
        hour: int
    ) -> dict:
        if self.dataset.empty:
            return {
                "category_registration_rate": 0.35,
                "category_attendance_rate": 0.50,
                "department_participation_rate": 0.45,
                "hour_registration_rate": 0.35,
                "day_registration_rate": 0.35,
                "history_rows": 0
            }

        df = self.dataset.copy()

        available = df[df.get("outcome_available", 1) == 1].copy()
        if available.empty:
            available = df

        global_reg = float(available["registration_rate"].mean()) if "registration_rate" in available else 0.35
        global_att = float(available["attendance_rate"].mean()) if "attendance_rate" in available else 0.50

        category_rows = available[available["event_category"].astype(str) == str(category)]
        day_rows = available[available["day_of_week"] == day_of_week]
        hour_rows = available[available["hour"] == hour]

        if target_department_id is not None:
            dept_rows = available[
                pd.to_numeric(
                    available["target_department_id"],
                    errors="coerce"
                ).fillna(0).astype(int) == int(target_department_id)
            ]
        else:
            dept_rows = pd.DataFrame()

        return {
            "category_registration_rate": self._mean_or_fallback(
                category_rows,
                "registration_rate",
                global_reg
            ),
            "category_attendance_rate": self._mean_or_fallback(
                category_rows,
                "attendance_rate",
                global_att
            ),
            "department_participation_rate": self._mean_or_fallback(
                dept_rows,
                "attendance_rate",
                global_att
            ),
            "hour_registration_rate": self._mean_or_fallback(
                hour_rows,
                "registration_rate",
                global_reg
            ),
            "day_registration_rate": self._mean_or_fallback(
                day_rows,
                "registration_rate",
                global_reg
            ),
            "history_rows": int(len(available))
        }

    def _mean_or_fallback(self, df: pd.DataFrame, column: str, fallback: float) -> float:
        if df.empty or column not in df.columns:
            return float(fallback)

        value = pd.to_numeric(df[column], errors="coerce").dropna()

        if value.empty:
            return float(fallback)

        return float(value.mean())

    def _conflict_metrics(
        self,
        runtime_events: pd.DataFrame,
        slot_start: datetime,
        slot_end: datetime,
        target_department_id: int | None
    ) -> dict:
        if runtime_events.empty:
            return {
                "events_same_day_count": 0,
                "overlap_count": 0,
                "department_overlap_count": 0
            }

        events = runtime_events.copy()
        events = events[events["start_at_dt"].notna()].copy()

        slot_date = slot_start.date()

        same_day = events[
            events["start_at_dt"].dt.date == slot_date
        ]

        overlapping = events[
            (events["start_at_dt"] < slot_end)
            & (events["end_at_dt"] > slot_start)
        ]

        department_overlap_count = 0

        if target_department_id is not None and int(target_department_id) > 0:
            department_overlap_count = int(
                len(
                    overlapping[
                        overlapping["target_department_id"] == int(target_department_id)
                    ]
                )
            )

        return {
            "events_same_day_count": int(len(same_day)),
            "overlap_count": int(len(overlapping)),
            "department_overlap_count": department_overlap_count
        }

    def _time_preference_score(self, hour: int) -> float:
        if hour in [10, 11, 14, 15]:
            return 0.75

        if hour in [9, 16]:
            return 0.55

        if hour >= 18:
            return 0.45

        return 0.35

    def _confidence_label(self, history: dict) -> str:
        rows = int(history.get("history_rows", 0))

        if rows >= 500:
            return "MEDIUM"

        if rows >= 100:
            return "LOW"

        return "VERY_LOW"

    def _build_reasons(
        self,
        hour: int,
        history: dict,
        conflicts: dict,
        score: float
    ) -> list[str]:
        reasons: list[str] = []

        if history["hour_registration_rate"] >= history["day_registration_rate"]:
            reasons.append("Créneau historiquement favorable en taux d’inscription.")

        if history["category_attendance_rate"] >= 0.50:
            reasons.append("La catégorie présente un historique de présence correct.")

        if conflicts["overlap_count"] == 0:
            reasons.append("Aucun événement en conflit direct sur ce créneau.")
        else:
            reasons.append("Créneau pénalisé par des événements en chevauchement.")

        if conflicts["department_overlap_count"] == 0:
            reasons.append("Aucun conflit détecté pour le département ciblé.")

        if hour in [10, 11, 14, 15]:
            reasons.append("Horaire adapté aux habitudes professionnelles.")

        if score >= 0.65:
            reasons.append("Score global élevé selon les règles de planification.")

        if not reasons:
            reasons.append("Créneau acceptable selon les données historiques disponibles.")

        return reasons[:4]
    

    def propose_events(
        self,
        payload: PlanningEventProposalRequest
    ) -> PlanningEventProposalResponse:
        request_id = str(uuid4())
        generated_at = utc_now().isoformat()

        week_start, week_end = self._previous_week_range(payload.reference_date)

        users = load_runtime_users()
        events = load_runtime_events()
        registrations = load_runtime_registrations()
        feedbacks = load_runtime_feedbacks()
        invitations = load_runtime_invitations()

        weekly_events = self._filter_events_between(events, week_start, week_end)

        weekly_metrics = self._build_weekly_event_metrics(
            weekly_events=weekly_events,
            registrations=registrations,
            feedbacks=feedbacks,
            invitations=invitations
        )

        raw_proposals = self._build_event_proposal_candidates(
            weekly_metrics=weekly_metrics,
            users=users,
            target_department_id=payload.target_department_id,
            limit=payload.limit
        )

        final_items: list[PlanningEventProposal] = []

        for rank, proposal in enumerate(raw_proposals[:payload.limit], start=1):
            slot_payload = PlanningSuggestionRequest(
                category=proposal["category"],
                audience=proposal["audience"],
                location_type=proposal["location_type"],
                target_department_id=proposal["target_department_id"],
                duration_minutes=proposal["duration_minutes"],
                capacity=proposal["capacity"],
                from_date=week_end.isoformat(),
                days_horizon=payload.days_horizon,
                limit=payload.slot_limit
            )

            slot_response = self.suggest_slots(slot_payload)

            final_items.append(
                PlanningEventProposal(
                    rank=rank,
                    title=proposal["title"],
                    category=proposal["category"],
                    audience=proposal["audience"],
                    location_type=proposal["location_type"],
                    target_department_id=proposal["target_department_id"],
                    duration_minutes=proposal["duration_minutes"],
                    capacity=proposal["capacity"],
                    objective=proposal["objective"],
                    rationale=proposal["rationale"],
                    suggested_slots=slot_response.items,
                    metrics=proposal["metrics"]
                )
            )

        response = PlanningEventProposalResponse(
            request_id=request_id,
            generated_at=generated_at,
            analysis_period={
                "from": week_start.isoformat(),
                "to": week_end.isoformat(),
                "source": "previous_week"
            },
            total_proposals=len(final_items),
            items=final_items,
            model_info={
                "module": "IA 4 Planning Intelligent",
                "version": (
                    self.planning_model_metadata.get("version")
                    if self.planning_model_metadata
                    else "planning-proposal-hybrid-v0.3"
                ),
                "strategy": (
                    "weekly_history_analysis_plus_catboost_slot_scoring"
                    if self.planning_model is not None
                    else "weekly_history_analysis_plus_hybrid_slot_scoring"
                ),
                "trained_model_used": self.planning_model is not None
            }
        )

        append_planning_log(
            "EVENT_PROPOSALS_GENERATED",
            {
                "request_id": request_id,
                "target_department_id": payload.target_department_id,
                "limit": payload.limit,
                "slot_limit": payload.slot_limit,
                "days_horizon": payload.days_horizon,
                "total_proposals": response.total_proposals,
                "model_info": response.model_info
            }
        )

        return response


    def _previous_week_range(self, reference_date: str | None) -> tuple[datetime, datetime]:
        reference = parse_start_date(reference_date) if reference_date else utc_now()

        start_of_current_week = reference - timedelta(days=reference.weekday())
        start_of_current_week = start_of_current_week.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        week_start = start_of_current_week - timedelta(days=7)
        week_end = start_of_current_week

        return week_start, week_end


    def _filter_events_between(
        self,
        events: pd.DataFrame,
        week_start: datetime,
        week_end: datetime
    ) -> pd.DataFrame:
        if events.empty:
            return events

        events = events.copy()
        events["start_at_dt"] = pd.to_datetime(events["start_at"], errors="coerce", utc=True)

        return events[
            events["start_at_dt"].notna()
            & (events["start_at_dt"] >= week_start)
            & (events["start_at_dt"] < week_end)
        ].copy()


    def _build_weekly_event_metrics(
        self,
        weekly_events: pd.DataFrame,
        registrations: pd.DataFrame,
        feedbacks: pd.DataFrame,
        invitations: pd.DataFrame
    ) -> pd.DataFrame:
        if weekly_events.empty:
            return pd.DataFrame()

        events = weekly_events.copy()
        events["event_id"] = events["id"].astype(str)

        reg_agg = pd.DataFrame(columns=["event_id", "registered_count", "present_count"])
        if not registrations.empty:
            regs = registrations.copy()
            regs["event_id"] = regs["event_id"].astype(str)
            if "status" not in regs.columns:
                regs["status"] = ""

            if "attendance_status" not in regs.columns:
                regs["attendance_status"] = ""

            regs["status"] = regs["status"].fillna("").astype(str).str.upper()
            regs["attendance_status"] = regs["attendance_status"].fillna("").astype(str).str.upper()

            active_regs = regs[~regs["status"].isin(CANCELLED_REGISTRATION_VALUES)].copy()
            active_regs["is_present"] = active_regs["attendance_status"].isin(
                PRESENT_ATTENDANCE_VALUES
            ).astype(int)

            reg_agg = active_regs.groupby("event_id").agg(
                registered_count=("event_id", "count"),
                present_count=("is_present", "sum")
            ).reset_index()

        feedback_agg = pd.DataFrame(columns=["event_id", "feedback_count", "average_rating"])
        if not feedbacks.empty:
            fbs = feedbacks.copy()
            fbs["event_id"] = fbs["event_id"].astype(str)
            fbs["rating"] = pd.to_numeric(fbs["rating"], errors="coerce").fillna(0)

            feedback_agg = fbs.groupby("event_id").agg(
                feedback_count=("rating", "count"),
                average_rating=("rating", "mean")
            ).reset_index()

        invitation_agg = pd.DataFrame(columns=["event_id", "invitation_count"])
        if not invitations.empty:
            invs = invitations.copy()
            invs["event_id"] = invs["event_id"].astype(str)

            invitation_agg = invs.groupby("event_id").size().reset_index(
                name="invitation_count"
            )

        dataset = events.merge(reg_agg, on="event_id", how="left")
        dataset = dataset.merge(feedback_agg, on="event_id", how="left")
        dataset = dataset.merge(invitation_agg, on="event_id", how="left")

        for column in [
            "registered_count",
            "present_count",
            "feedback_count",
            "average_rating",
            "invitation_count"
        ]:
            dataset[column] = pd.to_numeric(dataset[column], errors="coerce").fillna(0)

        dataset["capacity"] = pd.to_numeric(dataset["capacity"], errors="coerce").fillna(0)

        dataset["registration_rate"] = (
            dataset["registered_count"] / dataset["capacity"].replace(0, pd.NA)
        ).fillna(0).clip(0, 1)

        dataset["attendance_rate"] = (
            dataset["present_count"] / dataset["registered_count"].replace(0, pd.NA)
        ).fillna(0).clip(0, 1)

        return dataset
    

    def _build_event_proposal_candidates(
        self,
        weekly_metrics: pd.DataFrame,
        users: pd.DataFrame,
        target_department_id: int | None,
        limit: int
    ) -> list[dict]:
        proposals: list[dict] = []

        if weekly_metrics.empty:
            return self._fallback_proposal_catalog(
                users=users,
                target_department_id=target_department_id
            )[:limit]

        df = weekly_metrics.copy()
        df["category"] = df["category"].fillna("Autre").astype(str)
        df["audience"] = df["audience"].fillna("GLOBAL").astype(str).str.upper()
        df["location_type"] = df["location_type"].fillna("ONSITE").astype(str).str.upper()
        df["duration_minutes"] = pd.to_numeric(df["duration_minutes"], errors="coerce").fillna(60)
        df["capacity"] = pd.to_numeric(df["capacity"], errors="coerce").fillna(30)
        df["target_department_id"] = pd.to_numeric(
            df["target_department_id"],
            errors="coerce"
        ).fillna(0).astype(int)

        if target_department_id is not None:
            df = df[
                (df["target_department_id"] == int(target_department_id))
                | (df["audience"] == "GLOBAL")
            ].copy()

        if df.empty:
            return self._fallback_proposal_catalog(
                users=users,
                target_department_id=target_department_id
            )[:limit]

        category_summary = df.groupby("category").agg(
            events_count=("event_id", "count"),
            avg_registration_rate=("registration_rate", "mean"),
            avg_attendance_rate=("attendance_rate", "mean"),
            avg_rating=("average_rating", "mean"),
            avg_capacity=("capacity", "mean"),
            avg_duration=("duration_minutes", "mean"),
            total_registered=("registered_count", "sum"),
            total_invitations=("invitation_count", "sum")
        ).reset_index()

        category_summary["avg_rating"] = category_summary["avg_rating"].fillna(0)

        category_summary["data_confidence_score"] = (
            category_summary["events_count"].clip(0, 5) / 5
        )

        category_summary["engagement_gap"] = (
            1 - category_summary["avg_registration_rate"].clip(0, 1)
        )

        category_summary["quality_signal"] = (
            category_summary["avg_rating"].clip(0, 5) / 5
        )

        category_summary["demand_signal"] = (
            category_summary["total_registered"].clip(0, 50) / 50
        )

        category_summary["proposal_score"] = (
            0.35 * category_summary["engagement_gap"]
            + 0.25 * category_summary["quality_signal"]
            + 0.20 * category_summary["demand_signal"]
            + 0.20 * category_summary["data_confidence_score"]
        ).clip(0, 1)

        # Évite de promouvoir des catégories avec trop peu de signal.
        category_summary = category_summary.sort_values(
            ["proposal_score", "events_count"],
            ascending=False
        )

        for _, row in category_summary.iterrows():
            category = str(row["category"])

            capacity = int(max(
                20,
                min(120, row["avg_capacity"] if row["avg_capacity"] > 0 else self._default_capacity(users, target_department_id))
            ))

            duration = int(max(
                45,
                min(180, row["avg_duration"] if row["avg_duration"] > 0 else 90)
            ))

            avg_registration_rate = float(row["avg_registration_rate"] or 0)
            avg_attendance_rate = float(row["avg_attendance_rate"] or 0)
            avg_rating = float(row["avg_rating"] or 0)
            events_count = int(row["events_count"])

            data_confidence = "MEDIUM" if events_count >= 5 else "LOW"

            proposal = {
                "title": self._proposal_title_for_category(category),
                "category": category,
                "audience": "DEPARTMENT" if target_department_id else "GLOBAL",
                "location_type": self._preferred_location_for_category(category),
                "target_department_id": target_department_id,
                "duration_minutes": duration,
                "capacity": capacity,
                "objective": self._proposal_objective_for_category(category),
                "rationale": self._build_proposal_rationale(
                    category=category,
                    events_count=events_count,
                    avg_registration_rate=avg_registration_rate,
                    avg_attendance_rate=avg_attendance_rate,
                    avg_rating=avg_rating,
                    data_confidence=data_confidence
                ),
                "metrics": {
                    "events_count_previous_week": events_count,
                    "avg_registration_rate": round(avg_registration_rate, 4),
                    "avg_attendance_rate": round(avg_attendance_rate, 4),
                    "avg_rating": round(avg_rating, 4),
                    "proposal_score": round(float(row["proposal_score"]), 4),
                    "data_confidence": data_confidence
                }
            }

            proposals.append(proposal)

        return self._supplement_proposals(
            proposals=proposals,
            users=users,
            target_department_id=target_department_id,
            limit=limit
        )
    
    def _proposal_title_for_category(self, category: str) -> str:
        mapping = {
            "Formation": "Atelier pratique montée en compétences",
            "Webinaire": "Webinaire expert partage de connaissances",
            "Atelier": "Workshop collaboratif bonnes pratiques",
            "Conférence": "Conférence interne retour d’expérience",
            "Team building": "Défi collaboratif cohésion d’équipe",
            "Culture d’entreprise": "Rencontre culture interne et engagement",
            "Afterwork": "Afterwork réseau interne",
            "Networking": "Forum d’échanges et networking interne",
            "Bien-être": "Pause bien-être et équilibre au travail",
            "Innovation": "Session innovation et idées terrain",
            "RSE": "Journée engagement RSE"
        }

        return mapping.get(category, f"Événement interne autour de {category}")


    def _proposal_objective_for_category(self, category: str) -> str:
        mapping = {
            "Formation": "Renforcer les compétences des collaborateurs avec un format pratique.",
            "Team building": "Améliorer la cohésion et l’engagement des équipes.",
            "Culture d’entreprise": "Renforcer l’adhésion aux valeurs et pratiques internes.",
            "Afterwork": "Favoriser les échanges informels et le réseau interne.",
            "Networking": "Créer des connexions entre collaborateurs et équipes.",
            "Bien-être": "Soutenir l’équilibre et la qualité de vie au travail.",
            "Innovation": "Stimuler la créativité et la proposition d’idées.",
            "RSE": "Encourager l’engagement responsable des collaborateurs."
        }

        return mapping.get(
            category,
            "Proposer un événement interne adapté aux signaux observés dans les données récentes."
        )
    
    def _select_diverse_slots(self, candidates: list[dict], limit: int) -> list[dict]:
        sorted_candidates = sorted(
            candidates,
            key=lambda item: item["score"],
            reverse=True
        )

        selected: list[dict] = []
        used_dates: set[str] = set()
        used_hours: set[int] = set()

        for item in sorted_candidates:
            date_key = item["start_at"][:10]
            hour = int(item["hour"])

            if date_key in used_dates:
                continue

            if len(selected) >= 2 and hour in used_hours:
                continue

            selected.append(item)
            used_dates.add(date_key)
            used_hours.add(hour)

            if len(selected) >= limit:
                return selected

        for item in sorted_candidates:
            if item not in selected:
                selected.append(item)

            if len(selected) >= limit:
                break

        return selected
    
    def _default_capacity(self, users: pd.DataFrame, target_department_id: int | None) -> int:
        if users.empty:
            return 30

        if target_department_id is None:
            return 40

        if "department_id" not in users.columns:
            return 30

        data = users.copy()
        data["department_id"] = pd.to_numeric(data["department_id"], errors="coerce").fillna(0).astype(int)

        if "is_active" in data.columns:
            active = data["is_active"].fillna("").astype(str).str.lower()
            data = data[active.isin(["true", "1", "yes", "y"])].copy()

        department_size = len(data[data["department_id"] == int(target_department_id)])

        if department_size <= 0:
            return 30

        return int(max(15, min(80, round(department_size * 0.35))))


    def _preferred_location_for_category(self, category: str) -> str:
        online_categories = {
            "Webinaire",
            "Formation",
            "Conférence"
        }

        onsite_categories = {
            "Team building",
            "Sport",
            "Bien-être",
            "Afterwork",
            "Networking",
            "Culture d’entreprise"
        }

        if category in online_categories:
            return "ONLINE"

        if category in onsite_categories:
            return "ONSITE"

        return "ONSITE"


    def _build_proposal_rationale(
        self,
        category: str,
        events_count: int,
        avg_registration_rate: float,
        avg_attendance_rate: float,
        avg_rating: float,
        data_confidence: str
    ) -> list[str]:
        reasons: list[str] = []

        if data_confidence == "LOW":
            reasons.append(
                f"La catégorie {category} dispose d’un signal récent limité ; la proposition doit être validée par le RH."
            )
        else:
            reasons.append(
                f"La catégorie {category} apparaît suffisamment dans l’historique récent pour guider une proposition."
            )

        if avg_registration_rate < 0.30:
            reasons.append(
                "Le taux d’inscription récent est faible : un format plus ciblé peut aider à améliorer l’engagement."
            )
        elif avg_registration_rate < 0.60:
            reasons.append(
                "Le taux d’inscription récent est moyen : une nouvelle session mieux positionnée peut améliorer la participation."
            )
        else:
            reasons.append(
                "Le taux d’inscription récent est encourageant : la catégorie peut être réutilisée avec un bon créneau."
            )

        if avg_attendance_rate < 0.50:
            reasons.append(
                "Le taux de présence suggère de privilégier un format court, clair et facile à intégrer dans l’agenda."
            )
        else:
            reasons.append(
                "Le taux de présence observé indique un intérêt réel lorsque le créneau est adapté."
            )

        if avg_rating >= 4:
            reasons.append(
                "Les notes de satisfaction sont bonnes, ce qui renforce l’intérêt de proposer un événement similaire."
            )
        elif avg_rating > 0:
            reasons.append(
                "Les retours de satisfaction restent perfectibles : l’événement doit avoir un objectif clair et opérationnel."
            )

        return reasons[:4]
    
    def _fallback_proposal_catalog(
        self,
        users: pd.DataFrame,
        target_department_id: int | None
    ) -> list[dict]:
        audience = "DEPARTMENT" if target_department_id else "GLOBAL"
        capacity = self._default_capacity(users, target_department_id)

        return [
            {
                "title": "Atelier pratique montée en compétences",
                "category": "Formation",
                "audience": audience,
                "location_type": "ONLINE",
                "target_department_id": target_department_id,
                "duration_minutes": 60,
                "capacity": capacity,
                "objective": "Renforcer les compétences des collaborateurs avec un format court et opérationnel.",
                "rationale": [
                    "Les données récentes sont limitées pour ce périmètre.",
                    "Une formation courte permet de proposer une action utile avec un risque faible.",
                    "Le créneau sera optimisé par le moteur de planning."
                ],
                "metrics": {
                    "source": "strategic_fallback",
                    "data_confidence": "LOW"
                }
            },
            {
                "title": "Défi collaboratif cohésion d’équipe",
                "category": "Team building",
                "audience": audience,
                "location_type": "ONSITE",
                "target_department_id": target_department_id,
                "duration_minutes": 90,
                "capacity": capacity,
                "objective": "Améliorer la cohésion et l’engagement des équipes.",
                "rationale": [
                    "Le moteur recommande une action collaborative lorsque les signaux récents sont faibles.",
                    "Le format collectif favorise l’engagement et la participation.",
                    "Le choix final reste à valider par le RH ou le manager."
                ],
                "metrics": {
                    "source": "strategic_fallback",
                    "data_confidence": "LOW"
                }
            },
            {
                "title": "Session innovation et idées terrain",
                "category": "Innovation",
                "audience": audience,
                "location_type": "ONSITE",
                "target_department_id": target_department_id,
                "duration_minutes": 75,
                "capacity": capacity,
                "objective": "Faire émerger des idées concrètes à partir des besoins terrain.",
                "rationale": [
                    "Une session innovation permet de créer de l’engagement même avec peu de données récentes.",
                    "Le format participatif aide à identifier des sujets utiles pour les collaborateurs.",
                    "Les créneaux proposés limitent les conflits avec l’agenda existant."
                ],
                "metrics": {
                    "source": "strategic_fallback",
                    "data_confidence": "LOW"
                }
            },
            {
                "title": "Rencontre culture interne et engagement",
                "category": "Culture d’entreprise",
                "audience": audience,
                "location_type": "ONSITE",
                "target_department_id": target_department_id,
                "duration_minutes": 60,
                "capacity": capacity,
                "objective": "Renforcer l’adhésion aux pratiques et valeurs internes.",
                "rationale": [
                    "La culture interne est pertinente lorsque le moteur manque de signaux récents ciblés.",
                    "Le format court facilite l’intégration dans l’agenda.",
                    "La proposition reste à adapter selon le contexte RH."
                ],
                "metrics": {
                    "source": "strategic_fallback",
                    "data_confidence": "LOW"
                }
            },
            {
                "title": "Pause bien-être et équilibre au travail",
                "category": "Bien-être",
                "audience": audience,
                "location_type": "ONSITE",
                "target_department_id": target_department_id,
                "duration_minutes": 45,
                "capacity": capacity,
                "objective": "Soutenir la qualité de vie au travail avec une activité accessible.",
                "rationale": [
                    "Un format bien-être peut améliorer l’engagement sans nécessiter une forte préparation.",
                    "La durée courte réduit le risque de faible disponibilité.",
                    "Le moteur sélectionne ensuite les créneaux les moins conflictuels."
                ],
                "metrics": {
                    "source": "strategic_fallback",
                    "data_confidence": "LOW"
                }
            }
        ]


    def _supplement_proposals(
        self,
        proposals: list[dict],
        users: pd.DataFrame,
        target_department_id: int | None,
        limit: int
    ) -> list[dict]:
        if len(proposals) >= limit:
            return proposals[:limit]

        existing_categories = {
            str(item.get("category", "")).lower()
            for item in proposals
        }

        for fallback in self._fallback_proposal_catalog(users, target_department_id):
            category_key = str(fallback.get("category", "")).lower()

            if category_key in existing_categories:
                continue

            proposals.append(fallback)
            existing_categories.add(category_key)

            if len(proposals) >= limit:
                break

        return proposals[:limit]
    
    def _category_hour_score(self, category: str, hour: int) -> float:
        category_normalized = str(category or "").lower()

        if "formation" in category_normalized or "webinaire" in category_normalized:
            if hour in [10, 11, 14]:
                return 0.85
            if hour in [9, 15]:
                return 0.65
            return 0.45

        if "team" in category_normalized or "sport" in category_normalized or "bien" in category_normalized:
            if hour in [12, 16, 17]:
                return 0.85
            if hour in [15, 18]:
                return 0.70
            return 0.45

        if "afterwork" in category_normalized or "networking" in category_normalized:
            if hour in [16, 17, 18]:
                return 0.90
            if hour in [15]:
                return 0.65
            return 0.35

        if "innovation" in category_normalized or "atelier" in category_normalized:
            if hour in [10, 14, 15]:
                return 0.80
            if hour in [11, 16]:
                return 0.65
            return 0.45

        if hour in [10, 14, 15]:
            return 0.70

        return 0.50


    def _day_preference_score(self, day_of_week: int) -> float:
        # 0 lundi, 1 mardi, 2 mercredi, 3 jeudi, 4 vendredi
        if day_of_week in [1, 2, 3]:
            return 0.80

        if day_of_week == 0:
            return 0.60

        if day_of_week == 4:
            return 0.45

        return 0.30


    def _horizon_score(self, slot_start: datetime) -> float:
        days_until = (slot_start - utc_now()).days

        if 7 <= days_until <= 21:
            return 0.85

        if 22 <= days_until <= 45:
            return 0.70

        if 3 <= days_until < 7:
            return 0.55

        return 0.40
    
    def _load_planning_model(self) -> None:
        try:
            metadata = get_active_model_metadata("planning")

            model_path = resolve_registry_path(
                metadata.get("artifact_path"),
                required=True
            )

            features_path = resolve_registry_path(
                metadata.get("features_path"),
                required=True
            )

            model = CatBoostRegressor()
            model.load_model(str(model_path))

            with features_path.open("r", encoding="utf-8") as file:
                features_payload = json.load(file)

            self.planning_model = model
            self.planning_features_payload = features_payload
            self.planning_model_metadata = metadata

        except Exception:
            self.planning_model = None
            self.planning_features_payload = None
            self.planning_model_metadata = None

    def _predict_slot_success_score(
        self,
        payload: PlanningSuggestionRequest,
        slot_start: datetime,
        runtime_events: pd.DataFrame,
        history: dict,
        conflicts: dict
    ) -> float | None:
        if self.planning_model is None or self.planning_features_payload is None:
            return None

        try:
            features = self.planning_features_payload["features"]
            categorical_features = self.planning_features_payload.get("categorical_features", [])

            row = {
                "event_category": payload.category,
                "event_audience": payload.audience,
                "event_location_type": payload.location_type if hasattr(payload, "location_type") else payload.location_type,
                "target_department_id": payload.target_department_id or 0,
                "capacity": payload.capacity,
                "duration_minutes": payload.duration_minutes,
                "day_of_week": slot_start.weekday(),
                "hour": slot_start.hour,
                "month": slot_start.month,
                "is_morning": int(8 <= slot_start.hour <= 11),
                "is_afternoon": int(12 <= slot_start.hour <= 17),
                "is_afterwork": int(slot_start.hour >= 18),
                "department_size": self._estimate_department_size(payload.target_department_id),
                "events_same_day_count": conflicts.get("events_same_day_count", 0),
                "events_same_department_same_week_count": conflicts.get("department_overlap_count", 0),
                "historical_category_registration_rate": history.get("category_registration_rate", 0),
                "historical_category_attendance_rate": history.get("category_attendance_rate", 0),
                "historical_department_participation_rate": history.get("department_participation_rate", 0),
                "historical_hour_registration_rate": history.get("hour_registration_rate", 0),
                "historical_day_registration_rate": history.get("day_registration_rate", 0)
            }

            df = pd.DataFrame([row])

            for column in features:
                if column not in df.columns:
                    df[column] = "UNKNOWN" if column in categorical_features else 0

            for column in categorical_features:
                df[column] = df[column].fillna("UNKNOWN").astype(str)

            for column in features:
                if column not in categorical_features:
                    df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

            prediction = float(self.planning_model.predict(df[features])[0])

            return clamp_score(prediction)

        except Exception:
            return None
        
    def _estimate_department_size(self, target_department_id: int | None) -> int:
        if self.dataset.empty:
            return 0

        if target_department_id is None:
            return int(pd.to_numeric(self.dataset.get("department_size", 0), errors="coerce").fillna(0).mean())

        rows = self.dataset[
            pd.to_numeric(
                self.dataset.get("target_department_id", 0),
                errors="coerce"
            ).fillna(0).astype(int) == int(target_department_id)
        ]

        if rows.empty or "department_size" not in rows.columns:
            return 0

        return int(pd.to_numeric(rows["department_size"], errors="coerce").fillna(0).mean())
    
    def _calibrate_candidate_scores(self, candidates: list[dict]) -> list[dict]:
        if not candidates:
            return candidates

        model_values = []
        hybrid_values = []

        for item in candidates:
            metrics = item.get("metrics", {})

            model_prediction = metrics.get("model_prediction")
            hybrid_score = metrics.get("hybrid_score", item.get("score", 0))

            if model_prediction is not None:
                model_values.append(float(model_prediction))

            hybrid_values.append(float(hybrid_score or 0))

        for item in candidates:
            metrics = item.setdefault("metrics", {})

            model_prediction = metrics.get("model_prediction")
            hybrid_score = float(metrics.get("hybrid_score", item.get("score", 0)) or 0)

            if model_prediction is not None and model_values:
                model_rank_score = self._rank_normalized_value(
                    float(model_prediction),
                    model_values
                )
            else:
                model_rank_score = 0.5

            hybrid_rank_score = self._rank_normalized_value(
                hybrid_score,
                hybrid_values
            )

            business_score = self._business_slot_score(metrics)

            overlap_count = int(metrics.get("overlap_count", 0) or 0)
            department_overlap_count = int(metrics.get("department_overlap_count", 0) or 0)

            conflict_penalty = min(0.18, 0.04 * overlap_count)
            department_penalty = min(0.18, 0.06 * department_overlap_count)

            relative_score = (
                0.55 * model_rank_score
                + 0.25 * hybrid_rank_score
                + 0.20 * business_score
            )

            display_score = clamp_score(
                0.35
                + 0.60 * relative_score
                - conflict_penalty
                - department_penalty
            )

            item["score"] = round(display_score, 4)

            metrics["score_type"] = "relative_ai_potential_score"
            metrics["model_prediction_raw"] = round(float(model_prediction), 4) if model_prediction is not None else None
            metrics["model_rank_score"] = round(model_rank_score, 4)
            metrics["hybrid_rank_score"] = round(hybrid_rank_score, 4)
            metrics["business_slot_score"] = round(business_score, 4)
            metrics["display_score"] = round(display_score, 4)

        return candidates
    
    def _rank_normalized_value(self, value: float, values: list[float]) -> float:
        valid_values = [
            float(item)
            for item in values
            if item is not None
        ]

        if len(valid_values) <= 1:
            return 0.5

        min_value = min(valid_values)
        max_value = max(valid_values)

        if abs(max_value - min_value) < 1e-9:
            return 0.5

        return clamp_score((value - min_value) / (max_value - min_value))


    def _business_slot_score(self, metrics: dict) -> float:
        category_hour_score = float(metrics.get("category_hour_score", 0.5) or 0.5)
        day_preference_score = float(metrics.get("day_preference_score", 0.5) or 0.5)
        horizon_score = float(metrics.get("horizon_score", 0.5) or 0.5)

        return clamp_score(
            0.45 * category_hour_score
            + 0.30 * day_preference_score
            + 0.25 * horizon_score
        )