import json
from typing import Any

import pandas as pd

from app.services.planning_llm_client import PlanningLlmClient, PlanningLlmError


ALLOWED_LOCATION_TYPES = {"ONSITE", "ONLINE", "EXTERNAL"}
ALLOWED_AUDIENCES = {"GLOBAL", "DEPARTMENT"}


class PlanningIdeationService:
    def __init__(self) -> None:
        self.llm_client = PlanningLlmClient()
        self.last_error: str | None = None

    def model_info(self) -> dict[str, Any]:
        info = self.llm_client.model_info()
        info["last_ideation_error"] = self.last_error
        return info

    def generate_event_concepts(
        self,
        weekly_metrics: pd.DataFrame,
        users: pd.DataFrame,
        target_department_id: int | None,
        limit: int
    ) -> list[dict[str, Any]]:
        self.last_error = None

        context = self._build_context(
            weekly_metrics=weekly_metrics,
            users=users,
            target_department_id=target_department_id
        )

        concept_count = min(max(limit, 3), 5)

        try:
            response = self.llm_client.generate_json(
                system_prompt=self._system_prompt(),
                user_prompt=self._user_prompt(context=context, limit=concept_count)
            )

            concepts = response.get("concepts", [])

            clean = self._validate_concepts(
                concepts=concepts,
                target_department_id=target_department_id,
                users=users
            )

            if not clean:
                raise PlanningLlmError("Le LLM a répondu, mais les concepts générés sont trop faibles ou trop génériques.")

            return clean

        except PlanningLlmError as exception:
            self.last_error = str(exception)

            return self._safe_minimal_fallback(
                target_department_id=target_department_id,
                users=users,
                error_message=self.last_error
            )

    def _system_prompt(self) -> str:
        return """
    /no_think
    Tu es un assistant IA RH pour CapEvents.
    Réponds uniquement avec un JSON valide.
    Aucun texte hors JSON.
    Aucune explication.
    Aucune balise markdown.
    Aucun lien, aucune adresse, aucune salle.
    """

    def _user_prompt(self, context: dict[str, Any], limit: int) -> str:
        compact_context = {
            "scope": context.get("scope"),
            "data_quality": context.get("data_quality"),
            "observed_categories": context.get("observed_categories", [])[:6],
            "category_summary": context.get("category_summary", [])[:5]
        }

        return f"""
    /no_think
    Génère exactement {limit} idées d’événements internes.

    Réponds uniquement avec ce format JSON compact :
    {{
    "concepts": [
        {{
        "t": "titre court",
        "c": "catégorie",
        "a": "GLOBAL",
        "l": "ONSITE",
        "d": 60,
        "cap": 30,
        "o": "objectif court",
        "r": ["raison 1", "raison 2"],
        "s": ["signal 1"]
        }}
    ]
    }}

    Contraintes :
    - t maximum 55 caractères.
    - o maximum 120 caractères.
    - r contient exactement 2 raisons courtes.
    - s contient maximum 2 signaux.
    - a vaut GLOBAL ou DEPARTMENT.
    - l vaut ONSITE, ONLINE ou EXTERNAL.
    - Pas de lien.
    - Pas d’adresse.
    - Pas de salle.
    - Pas de texte hors JSON.

    Contexte :
    {json.dumps(compact_context, ensure_ascii=False)}
    """

    def _build_context(
        self,
        weekly_metrics: pd.DataFrame,
        users: pd.DataFrame,
        target_department_id: int | None
    ) -> dict[str, Any]:
        context: dict[str, Any] = {
            "target_department_id": target_department_id,
            "scope": "DEPARTMENT" if target_department_id else "GLOBAL",
            "active_users_count": int(len(users)) if users is not None else 0,
            "data_quality": "LOW",
            "observed_categories": [],
            "recent_events": [],
            "category_summary": []
        }

        if weekly_metrics is None or weekly_metrics.empty:
            context["note"] = "Aucun événement récent exploitable sur la semaine analysée."
            return context

        df = weekly_metrics.copy()
        df["category"] = df["category"].fillna("Autre").astype(str)
        df["title"] = df["title"].fillna("").astype(str)

        context["data_quality"] = "MEDIUM" if len(df) >= 5 else "LOW"
        context["observed_categories"] = sorted(df["category"].dropna().unique().tolist())

        recent_cols = [
            "title",
            "category",
            "audience",
            "location_type",
            "duration_minutes",
            "capacity",
            "registration_rate",
            "attendance_rate",
            "average_rating",
            "invitation_count"
        ]

        available_cols = [col for col in recent_cols if col in df.columns]

        context["recent_events"] = (
            df[available_cols]
            .head(5)
            .round(4)
            .to_dict(orient="records")
        )

        summary = df.groupby("category").agg(
            events_count=("event_id", "count"),
            avg_registration_rate=("registration_rate", "mean"),
            avg_attendance_rate=("attendance_rate", "mean"),
            avg_rating=("average_rating", "mean"),
            avg_capacity=("capacity", "mean"),
            avg_duration=("duration_minutes", "mean"),
            total_invitations=("invitation_count", "sum")
        ).reset_index()

        for column in [
            "avg_registration_rate",
            "avg_attendance_rate",
            "avg_rating",
            "avg_capacity",
            "avg_duration",
            "total_invitations"
        ]:
            summary[column] = pd.to_numeric(summary[column], errors="coerce").fillna(0)

        context["category_summary"] = (
            summary.sort_values(["events_count", "total_invitations"], ascending=False)
            .head(6)
            .round(4)
            .to_dict(orient="records")
        )

        return context

    def _validate_concepts(
        self,
        concepts: list[dict[str, Any]],
        target_department_id: int | None,
        users: pd.DataFrame
    ) -> list[dict[str, Any]]:
        clean: list[dict[str, Any]] = []
        seen_titles: set[str] = set()

        for item in concepts:
            if not isinstance(item, dict):
                continue

            title = str(item.get("title") or item.get("t") or "").strip()
            category = str(item.get("category") or item.get("c") or "").strip()

            if self._is_low_quality_text(title, min_words=3):
                continue

            if len(title) < 8 or len(category) < 2:
                continue

            title_key = title.lower()

            if title_key in seen_titles:
                continue

            seen_titles.add(title_key)

            audience = str(
                item.get("audience")
                or item.get("a")
                or ("DEPARTMENT" if target_department_id else "GLOBAL")
            ).upper()

            if target_department_id is not None:
                audience = "DEPARTMENT"

            if audience not in ALLOWED_AUDIENCES:
                audience = "GLOBAL"

            location_type = str(
                item.get("location_type")
                or item.get("l")
                or "ONSITE"
            ).upper()

            if location_type not in ALLOWED_LOCATION_TYPES:
                location_type = "ONSITE"

            duration = self._safe_int(
                item.get("duration_minutes") or item.get("d"),
                60
            )
            duration = max(30, min(180, duration))

            capacity = self._safe_int(
                item.get("capacity") or item.get("cap"),
                self._default_capacity(users, target_department_id)
            )
            capacity = max(10, min(150, capacity))

            rationale = item.get("rationale") or item.get("r") or []
            if not isinstance(rationale, list):
                rationale = [str(rationale)]

            data_signals = item.get("data_signals") or item.get("s") or []
            if not isinstance(data_signals, list):
                data_signals = [str(data_signals)]

            objective = self._normalize_objective(
                objective=str(item.get("objective") or item.get("o") or "").strip(),
                title=title,
                category=category
            )

            normalized_rationale = self._normalize_rationale(
                rationale=rationale,
                category=category,
                data_signals=data_signals
            )

            clean.append({
                "title": title[:120],
                "category": category[:60],
                "audience": audience,
                "location_type": location_type,
                "target_department_id": target_department_id,
                "duration_minutes": duration,
                "capacity": capacity,
                "objective": objective[:500],
                "rationale": normalized_rationale,
                "metrics": {
                    "source": "llm_generated_concept",
                    "data_confidence": "LLM_ASSISTED",
                    "data_signals": [
                        str(signal).strip()
                        for signal in data_signals
                        if str(signal).strip()
                    ][:5]
                }
            })

        return clean

    def _default_capacity(self, users: pd.DataFrame, target_department_id: int | None) -> int:
        if users is None or users.empty:
            return 30

        if target_department_id is None or "department_id" not in users.columns:
            return min(60, max(20, int(len(users) * 0.15)))

        data = users.copy()
        data["department_id"] = pd.to_numeric(
            data["department_id"],
            errors="coerce"
        ).fillna(0).astype(int)

        size = len(data[data["department_id"] == int(target_department_id)])

        if size <= 0:
            return 30

        return min(80, max(15, int(size * 0.35)))

    def _safe_minimal_fallback(
        self,
        target_department_id: int | None,
        users: pd.DataFrame,
        error_message: str | None = None
    ) -> list[dict[str, Any]]:
        audience = "DEPARTMENT" if target_department_id else "GLOBAL"
        capacity = self._default_capacity(users, target_department_id)

        return [
            {
                "title": "Atelier collaboratif priorités équipe",
                "category": "Atelier",
                "audience": audience,
                "location_type": "ONSITE",
                "target_department_id": target_department_id,
                "duration_minutes": 60,
                "capacity": capacity,
                "objective": "Identifier des priorités concrètes et mobiliser les collaborateurs autour d’actions utiles.",
                "rationale": [
                    "Le générateur LLM n’a pas pu être utilisé.",
                    "Une proposition de secours est utilisée pour garantir la continuité du service.",
                    "La proposition doit être validée par le RH ou le manager."
                ],
                "metrics": {
                    "source": "fallback_llm_unavailable",
                    "data_confidence": "LOW",
                    "llm_error": error_message
                }
            }
        ]

    def _safe_int(self, value: Any, default: int) -> int:
        try:
            return int(value)
        except Exception:
            return default

    def _is_low_quality_text(self, value: str, min_words: int = 4) -> bool:
        text = str(value or "").strip().lower()

        if not text:
            return True

        words = [word for word in text.replace("-", " ").split() if word.strip()]

        if len(words) < min_words:
            return True

        generic_values = {
            "partage",
            "collaboration",
            "conférence",
            "sport",
            "formation",
            "atelier",
            "partage et collaboration",
            "collaboration et partage",
            "conférence et sport"
        }

        return text in generic_values


    def _normalize_objective(
        self,
        objective: str,
        title: str,
        category: str
    ) -> str:
        if not self._is_low_quality_text(objective, min_words=7):
            return objective.strip()

        return (
            f"Proposer un événement {category.lower()} structuré autour de « {title} » "
            "afin de renforcer l’engagement, le partage d’expérience et la participation des collaborateurs."
        )


    def _normalize_rationale(
        self,
        rationale: list,
        category: str,
        data_signals: list
    ) -> list[str]:
        clean = [
            str(item).strip()
            for item in rationale
            if not self._is_low_quality_text(str(item), min_words=4)
        ]

        if len(clean) >= 2:
            return clean[:4]

        signal_text = ", ".join(str(signal) for signal in data_signals[:2]) if data_signals else "les signaux récents disponibles"

        return [
            f"La catégorie {category} ressort comme une piste exploitable à partir de {signal_text}.",
            "Le format proposé reste à valider par le RH ou le manager avant publication.",
            "Le créneau sera ensuite optimisé par le modèle de planning et les contraintes calendrier."
        ]