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

        ranked = sorted(
            candidates,
            key=lambda item: item["score"],
            reverse=True
        )[:payload.limit]

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

        return PlanningSuggestionResponse(
            request_id=request_id,
            generated_at=generated_at,
            total_candidates=len(candidates),
            items=items,
            model_info={
                "module": "IA 4 Planning Intelligent",
                "version": "planning-hybrid-v0.1",
                "strategy": "historical_statistics_plus_business_rules",
                "trained_model_used": False,
                "dataset_path": str(DATASET_PATH)
            }
        )

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

        base_score = (
            0.25 * history["category_registration_rate"]
            + 0.20 * history["category_attendance_rate"]
            + 0.20 * history["hour_registration_rate"]
            + 0.15 * history["day_registration_rate"]
            + 0.10 * history["department_participation_rate"]
            + 0.10 * self._time_preference_score(hour)
        )

        conflict_penalty = min(0.30, 0.08 * conflicts["events_same_day_count"])
        department_conflict_penalty = min(0.25, 0.10 * conflicts["department_overlap_count"])

        duration_penalty = 0.0
        if payload.duration_minutes > 180:
            duration_penalty = 0.05

        score = clamp_score(
            base_score
            - conflict_penalty
            - department_conflict_penalty
            - duration_penalty
        )

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
                "duration_penalty": round(duration_penalty, 4)
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
            target_department_id=payload.target_department_id
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

        return PlanningEventProposalResponse(
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
                "version": "planning-proposal-hybrid-v0.1",
                "strategy": "weekly_history_analysis_plus_slot_scoring",
                "trained_model_used": False
            }
        )


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
        target_department_id: int | None
    ) -> list[dict]:
        proposals: list[dict] = []

        if weekly_metrics.empty:
            return [
                {
                    "title": "Atelier collaboratif engagement interne",
                    "category": "Team building",
                    "audience": "GLOBAL",
                    "location_type": "ONSITE",
                    "target_department_id": target_department_id,
                    "duration_minutes": 90,
                    "capacity": 30,
                    "objective": "Créer un événement fédérateur pour stimuler l’engagement des collaborateurs.",
                    "rationale": [
                        "Aucune donnée suffisante trouvée sur la semaine précédente.",
                        "Un format collaboratif est recommandé comme point de départ.",
                        "Le créneau sera optimisé par le moteur de planning."
                    ],
                    "metrics": {
                        "source": "fallback_no_weekly_data"
                    }
                }
            ]

        df = weekly_metrics.copy()
        df["category"] = df["category"].fillna("Autre").astype(str)
        df["audience"] = df["audience"].fillna("GLOBAL").astype(str)
        df["location_type"] = df["location_type"].fillna("ONSITE").astype(str)
        df["duration_minutes"] = pd.to_numeric(df["duration_minutes"], errors="coerce").fillna(60)
        df["target_department_id"] = pd.to_numeric(
            df["target_department_id"],
            errors="coerce"
        ).fillna(0).astype(int)

        if target_department_id is not None:
            df = df[
                (df["target_department_id"] == int(target_department_id))
                | (df["audience"].astype(str).str.upper() == "GLOBAL")
            ].copy()

        category_summary = df.groupby("category").agg(
            events_count=("event_id", "count"),
            avg_registration_rate=("registration_rate", "mean"),
            avg_attendance_rate=("attendance_rate", "mean"),
            avg_rating=("average_rating", "mean"),
            avg_capacity=("capacity", "mean"),
            avg_duration=("duration_minutes", "mean")
        ).reset_index()

        category_summary["opportunity_score"] = (
            (1 - category_summary["avg_registration_rate"].clip(0, 1)) * 0.45
            + (1 - category_summary["avg_attendance_rate"].clip(0, 1)) * 0.35
            + (category_summary["avg_rating"].fillna(0) / 5).clip(0, 1) * 0.20
        )

        category_summary = category_summary.sort_values(
            "opportunity_score",
            ascending=False
        )

        for _, row in category_summary.iterrows():
            category = str(row["category"])

            capacity = int(max(20, min(120, row["avg_capacity"] or 30)))
            duration = int(max(45, min(180, row["avg_duration"] or 90)))

            proposal = {
                "title": self._proposal_title_for_category(category),
                "category": category,
                "audience": "DEPARTMENT" if target_department_id else "GLOBAL",
                "location_type": "ONSITE",
                "target_department_id": target_department_id,
                "duration_minutes": duration,
                "capacity": capacity,
                "objective": self._proposal_objective_for_category(category),
                "rationale": [
                    f"La catégorie {category} présente une opportunité d’amélioration sur la semaine précédente.",
                    f"Taux moyen d’inscription observé : {round(float(row['avg_registration_rate']) * 100)}%.",
                    f"Taux moyen de présence observé : {round(float(row['avg_attendance_rate']) * 100)}%."
                ],
                "metrics": {
                    "events_count_previous_week": int(row["events_count"]),
                    "avg_registration_rate": round(float(row["avg_registration_rate"]), 4),
                    "avg_attendance_rate": round(float(row["avg_attendance_rate"]), 4),
                    "avg_rating": round(float(row["avg_rating"]), 4),
                    "opportunity_score": round(float(row["opportunity_score"]), 4)
                }
            }

            proposals.append(proposal)

        return proposals
    
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