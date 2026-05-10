import json
from typing import Any

import pandas as pd

from app.services.planning_llm_client import PlanningLlmClient, PlanningLlmError


ALLOWED_LOCATION_TYPES = {"ONSITE", "ONLINE", "EXTERNAL"}
ALLOWED_AUDIENCES = {"GLOBAL", "DEPARTMENT"}


class PlanningIdeationService:
    def __init__(self) -> None:
        self.llm_client = PlanningLlmClient()

    def generate_event_concepts(
        self,
        weekly_metrics: pd.DataFrame,
        users: pd.DataFrame,
        target_department_id: int | None,
        limit: int
    ) -> list[dict[str, Any]]:
        context = self._build_context(
            weekly_metrics=weekly_metrics,
            users=users,
            target_department_id=target_department_id
        )

        system_prompt = self._system_prompt()
        user_prompt = self._user_prompt(context=context, limit=max(limit * 5, 15))

        try:
            response = self.llm_client.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt
            )

            concepts = response.get("concepts", [])

            return self._validate_concepts(
                concepts=concepts,
                target_department_id=target_department_id,
                users=users
            )

        except PlanningLlmError:
            return self._safe_minimal_fallback(
                target_department_id=target_department_id,
                users=users
            )

    def _system_prompt(self) -> str:
        return """
Tu es un assistant IA de planification RH pour CapEvents.

Ta mission :
- Générer des idées d’événements internes professionnelles.
- Utiliser uniquement les signaux fournis.
- Ne jamais inventer un lien de visioconférence, une salle précise ou une adresse.
- Ne jamais décider à la place du RH ou du manager.
- Produire uniquement du JSON valide.

Important :
Le classement final sera fait par CatBoost et par des règles métier.
Ton rôle est uniquement de proposer des concepts candidats variés.
"""

    def _user_prompt(self, context: dict[str, Any], limit: int) -> str:
        return f"""
Génère {limit} concepts candidats d’événements internes à partir du contexte ci-dessous.

Chaque concept doit être spécifique, varié et professionnel.

Format JSON obligatoire :
{{
  "concepts": [
    {{
      "title": "...",
      "category": "...",
      "audience": "GLOBAL ou DEPARTMENT",
      "location_type": "ONSITE ou ONLINE ou EXTERNAL",
      "duration_minutes": 45,
      "capacity": 30,
      "objective": "...",
      "rationale": ["...", "...", "..."],
      "data_signals": ["...", "..."]
    }}
  ]
}}

Contraintes :
- 3 à 5 mots-clés métier dans le titre si possible.
- Pas de titres génériques répétés.
- Pas de lien meet.
- Pas d’adresse.
- Pas de salle.
- Catégories possibles : celles observées dans le contexte, ou une catégorie RH cohérente.
- Si les données sont faibles, explique clairement que la proposition doit être validée par RH.
- Le ton doit être professionnel, naturel, pas robotique.

Contexte :
{json.dumps(context, ensure_ascii=False, indent=2)}
"""

    def _build_context(
        self,
        weekly_metrics: pd.DataFrame,
        users: pd.DataFrame,
        target_department_id: int | None
    ) -> dict[str, Any]:
        context: dict[str, Any] = {
            "target_department_id": target_department_id,
            "department_scope": "DEPARTMENT" if target_department_id else "GLOBAL",
            "active_users_count": int(len(users)) if users is not None else 0,
            "recent_events": [],
            "category_summary": [],
            "observed_categories": []
        }

        if weekly_metrics is None or weekly_metrics.empty:
            context["data_quality"] = "LOW"
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
            .head(12)
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

        for col in [
            "avg_registration_rate",
            "avg_attendance_rate",
            "avg_rating",
            "avg_capacity",
            "avg_duration",
            "total_invitations"
        ]:
            summary[col] = pd.to_numeric(summary[col], errors="coerce").fillna(0)

        context["category_summary"] = summary.round(4).to_dict(orient="records")

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
            title = str(item.get("title", "")).strip()
            category = str(item.get("category", "")).strip()

            if len(title) < 8 or len(category) < 2:
                continue

            if title.lower() in seen_titles:
                continue

            seen_titles.add(title.lower())

            audience = str(item.get("audience") or ("DEPARTMENT" if target_department_id else "GLOBAL")).upper()
            if audience not in ALLOWED_AUDIENCES:
                audience = "DEPARTMENT" if target_department_id else "GLOBAL"

            if target_department_id is not None:
                audience = "DEPARTMENT"

            location_type = str(item.get("location_type") or "ONSITE").upper()
            if location_type not in ALLOWED_LOCATION_TYPES:
                location_type = "ONSITE"

            duration = int(item.get("duration_minutes") or 60)
            duration = max(30, min(180, duration))

            capacity = int(item.get("capacity") or self._default_capacity(users, target_department_id))
            capacity = max(10, min(150, capacity))

            rationale = item.get("rationale") or []
            if not isinstance(rationale, list):
                rationale = [str(rationale)]

            data_signals = item.get("data_signals") or []
            if not isinstance(data_signals, list):
                data_signals = [str(data_signals)]

            clean.append({
                "title": title[:120],
                "category": category[:60],
                "audience": audience,
                "location_type": location_type,
                "target_department_id": target_department_id,
                "duration_minutes": duration,
                "capacity": capacity,
                "objective": str(item.get("objective", "")).strip()[:500],
                "rationale": [str(reason).strip() for reason in rationale if str(reason).strip()][:4],
                "metrics": {
                    "source": "llm_generated_concept",
                    "data_signals": [str(signal).strip() for signal in data_signals if str(signal).strip()][:5],
                    "data_confidence": "LLM_ASSISTED"
                }
            })

        return clean

    def _default_capacity(self, users: pd.DataFrame, target_department_id: int | None) -> int:
        if users is None or users.empty:
            return 30

        if target_department_id is None or "department_id" not in users.columns:
            return min(60, max(20, int(len(users) * 0.15)))

        data = users.copy()
        data["department_id"] = pd.to_numeric(data["department_id"], errors="coerce").fillna(0).astype(int)
        size = len(data[data["department_id"] == int(target_department_id)])

        return min(80, max(15, int(size * 0.35))) if size > 0 else 30

    def _safe_minimal_fallback(
        self,
        target_department_id: int | None,
        users: pd.DataFrame
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
                    "Le générateur LLM n’est pas disponible.",
                    "Une proposition de secours est utilisée pour garantir la continuité du service.",
                    "La proposition doit être validée par le RH ou le manager."
                ],
                "metrics": {
                    "source": "fallback_llm_unavailable",
                    "data_confidence": "LOW"
                }
            }
        ]