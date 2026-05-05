from typing import Any

import requests
from sqlalchemy import text

from app.data.db import engine
from app.schemas.hr_copilot import HrCopilotResponse, HrCopilotSuggestion


OLLAMA_CHAT_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen3:0.6b"
OLLAMA_TIMEOUT_SECONDS = 45


class HrCopilotService:
    def get_suggestions(self) -> HrCopilotResponse:
        rule_suggestions = []

        rule_suggestions.extend(self._detect_pending_invitations())
        rule_suggestions.extend(self._detect_low_registration_events())
        rule_suggestions.extend(self._detect_low_feedback_events())

        ranked = self._rank_suggestions(rule_suggestions)[:3]

        final_suggestions = []
        qwen_used_any = False
        source = "rules_only"

        for suggestion in ranked:
            draft, qwen_used, draft_source = self._build_qwen_draft(suggestion)
            qwen_used_any = qwen_used_any or qwen_used

            if qwen_used:
                source = draft_source

            final_suggestions.append(
                HrCopilotSuggestion(
                    **suggestion,
                    draft=draft
                )
            )

        return HrCopilotResponse(
            suggestions=final_suggestions,
            qwen_used=qwen_used_any,
            summary_source=source
        )

    def _read_rows(self, query: str, params: dict | None = None) -> list[dict[str, Any]]:
        with engine.connect() as connection:
            rows = connection.execute(text(query), params or {}).mappings().all()

        return [dict(row) for row in rows]

    def _detect_pending_invitations(self) -> list[dict]:
        rows = self._read_rows("""
            SELECT
                e.id::text AS event_id,
                e.title AS event_title,
                COUNT(i.id) AS pending_count
            FROM event_invitations i
            JOIN events e ON e.id = i.event_id
            WHERE e.status = 'PUBLISHED'
              AND e.start_at > NOW()
              AND i.status = 'PENDING'
            GROUP BY e.id, e.title
            HAVING COUNT(i.id) >= 3
            ORDER BY pending_count DESC
            LIMIT 3
        """)

        suggestions = []

        for row in rows:
            pending_count = int(row["pending_count"])

            suggestions.append({
                "type": "PENDING_INVITATIONS",
                "priority": "HIGH" if pending_count >= 10 else "MEDIUM",
                "title": "Relancer les invitations en attente",
                "insight": f"{pending_count} invitation(s) sont encore en attente pour cet événement.",
                "recommended_action": "Envoyer une relance courte et ciblée aux collaborateurs invités.",
                "related_event_id": row["event_id"],
                "related_event_title": row["event_title"],
                "metadata": {
                    "pending_count": pending_count
                }
            })

        return suggestions

    def _detect_low_registration_events(self) -> list[dict]:
        rows = self._read_rows("""
            SELECT
                e.id::text AS event_id,
                e.title AS event_title,
                e.capacity,
                COUNT(r.id) AS registered_count
            FROM events e
            LEFT JOIN event_registrations r
                ON r.event_id = e.id
                AND r.status NOT IN ('CANCELLED', 'UNREGISTERED')
            WHERE e.status = 'PUBLISHED'
              AND e.start_at > NOW()
              AND e.capacity > 0
            GROUP BY e.id, e.title, e.capacity
            HAVING COUNT(r.id)::float / NULLIF(e.capacity, 0) < 0.30
            ORDER BY COUNT(r.id)::float / NULLIF(e.capacity, 0) ASC
            LIMIT 3
        """)

        suggestions = []

        for row in rows:
            capacity = int(row["capacity"] or 0)
            registered_count = int(row["registered_count"] or 0)
            rate = registered_count / capacity if capacity > 0 else 0

            suggestions.append({
                "type": "LOW_REGISTRATION",
                "priority": "HIGH" if rate < 0.15 else "MEDIUM",
                "title": "Améliorer le taux d’inscription",
                "insight": f"L’événement a seulement {registered_count}/{capacity} inscrit(s), soit {round(rate * 100)}%.",
                "recommended_action": "Renforcer la visibilité de l’événement et cibler les collaborateurs intéressés.",
                "related_event_id": row["event_id"],
                "related_event_title": row["event_title"],
                "metadata": {
                    "capacity": capacity,
                    "registered_count": registered_count,
                    "registration_rate": rate
                }
            })

        return suggestions

    def _detect_low_feedback_events(self) -> list[dict]:
        rows = self._read_rows("""
            SELECT
                e.id::text AS event_id,
                e.title AS event_title,
                AVG(f.rating) AS average_rating,
                COUNT(f.id) AS feedback_count
            FROM event_feedbacks f
            JOIN events e ON e.id = f.event_id
            GROUP BY e.id, e.title
            HAVING COUNT(f.id) >= 3
               AND AVG(f.rating) < 3.2
            ORDER BY AVG(f.rating) ASC
            LIMIT 3
        """)

        suggestions = []

        for row in rows:
            average_rating = float(row["average_rating"] or 0)
            feedback_count = int(row["feedback_count"] or 0)

            suggestions.append({
                "type": "LOW_FEEDBACK_SCORE",
                "priority": "HIGH" if average_rating < 2.8 else "MEDIUM",
                "title": "Analyser les feedbacks négatifs",
                "insight": f"L’événement a une note moyenne de {average_rating:.2f}/5 sur {feedback_count} feedback(s).",
                "recommended_action": "Consulter l’analyse Feedback Intelligence et identifier les axes d’amélioration.",
                "related_event_id": row["event_id"],
                "related_event_title": row["event_title"],
                "metadata": {
                    "average_rating": average_rating,
                    "feedback_count": feedback_count
                }
            })

        return suggestions

    def _rank_suggestions(self, suggestions: list[dict]) -> list[dict]:
        priority_score = {
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1
        }

        return sorted(
            suggestions,
            key=lambda item: priority_score.get(item["priority"], 0),
            reverse=True
        )

    def _build_qwen_draft(self, suggestion: dict) -> tuple[str, bool, str]:
        fallback = self._build_fallback_draft(suggestion)

        system_message = (
            "Tu es un assistant RH pour CapEvents. "
            "Tu rédiges des messages courts, professionnels et en français. "
            "Tu n’inventes aucune donnée. "
            "Tu utilises uniquement les informations fournies."
        )

        user_message = f"""
Rédige un brouillon RH court pour l'action suivante.

Type: {suggestion["type"]}
Priorité: {suggestion["priority"]}
Titre: {suggestion["title"]}
Constat: {suggestion["insight"]}
Action recommandée: {suggestion["recommended_action"]}
Événement concerné: {suggestion.get("related_event_title") or "Non précisé"}

Contraintes:
- 4 phrases maximum.
- Ton professionnel.
- Ne pas inventer de date, lieu ou chiffres.
"""

        try:
            response = requests.post(
                OLLAMA_CHAT_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": user_message}
                    ],
                    "stream": False,
                    "think": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 150
                    },
                    "keep_alive": "10m"
                },
                timeout=OLLAMA_TIMEOUT_SECONDS
            )

            if response.status_code != 200:
                return fallback, False, f"fallback_ollama_status_{response.status_code}"

            data = response.json()
            text_response = str(data.get("message", {}).get("content", "")).strip()

            if not text_response:
                return fallback, False, "fallback_empty_qwen_response"

            return text_response, True, "qwen3_ollama_chat"

        except Exception as exc:
            return fallback, False, f"fallback_ollama_error_{type(exc).__name__}"

    def _build_fallback_draft(self, suggestion: dict) -> str:
        event_title = suggestion.get("related_event_title")

        if suggestion["type"] == "PENDING_INVITATIONS":
            return (
                f"Bonjour, nous vous rappelons que l’événement "
                f"« {event_title} » est toujours ouvert aux réponses. "
                f"Votre confirmation nous aide à mieux organiser la participation. "
                f"Merci de répondre dès que possible."
            )

        if suggestion["type"] == "LOW_REGISTRATION":
            return (
                f"L’événement « {event_title} » présente un taux d’inscription faible. "
                f"Nous recommandons de renforcer sa visibilité auprès des collaborateurs concernés. "
                f"Une relance ciblée peut aider à améliorer la participation."
            )

        if suggestion["type"] == "LOW_FEEDBACK_SCORE":
            return (
                f"Les retours de l’événement « {event_title} » indiquent des axes d’amélioration. "
                f"Nous recommandons d’analyser les commentaires et d’ajuster l’organisation des prochains événements similaires."
            )

        return suggestion["recommended_action"]