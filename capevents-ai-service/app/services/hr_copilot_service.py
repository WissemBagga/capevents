from typing import Any

import requests
from sqlalchemy import text

from app.data.db import engine
from app.schemas.hr_copilot import HrCopilotResponse, HrCopilotSuggestion

from datetime import datetime, timedelta, timezone


OLLAMA_CHAT_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "qwen3:0.6b"
OLLAMA_TIMEOUT_SECONDS = 45


class HrCopilotService:
    def get_suggestions(self) -> HrCopilotResponse:
        rule_suggestions = []

        rule_suggestions.extend(self._detect_pending_invitations())
        rule_suggestions.extend(self._detect_low_registration_events())
        rule_suggestions.extend(self._detect_low_feedback_events())
        rule_suggestions.extend(self._detect_low_engagement_departments())
        rule_suggestions.extend(self._detect_rsvp_friction_events())

        ranked = self._rank_suggestions(rule_suggestions)[:3]

        final_suggestions = []
        qwen_used_any = False
        source = "rules_only"

        for suggestion in ranked:
            draft, qwen_used, draft_source = self._build_qwen_draft(suggestion)
            qwen_used_any = qwen_used_any or qwen_used

            if qwen_used:
                source = draft_source

            suggestion_payload = {
                **suggestion,
                "draft": draft
            }

            final_suggestions.append(suggestion_payload)

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
        cooldown_after = datetime.now(timezone.utc) - timedelta(hours=24)

        rows = self._read_rows("""
            SELECT
                e.id::text AS event_id,
                e.title AS event_title,

                COUNT(i.id) AS pending_count,

                SUM(
                    CASE
                        WHEN NOT EXISTS (
                            SELECT 1
                            FROM event_invitation_reminders r
                            WHERE r.invitation_id = i.id
                            AND r.status = 'SENT'
                            AND r.sent_at >= :cooldown_after
                        )
                        THEN 1 ELSE 0
                    END
                ) AS eligible_reminder_count,

                SUM(
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM event_invitation_reminders r
                            WHERE r.invitation_id = i.id
                            AND r.status = 'SENT'
                            AND r.sent_at >= :cooldown_after
                        )
                        THEN 1 ELSE 0
                    END
                ) AS recently_reminded_count

            FROM event_invitations i
            JOIN events e ON e.id = i.event_id
            WHERE e.status = 'PUBLISHED'
            AND e.start_at > NOW()
            AND i.status = 'PENDING'
            AND i.rsvp_response IS NULL
            GROUP BY e.id, e.title
            HAVING
                SUM(
                    CASE
                        WHEN NOT EXISTS (
                            SELECT 1
                            FROM event_invitation_reminders r
                            WHERE r.invitation_id = i.id
                            AND r.status = 'SENT'
                            AND r.sent_at >= :cooldown_after
                        )
                        THEN 1 ELSE 0
                    END
                ) > 0
            ORDER BY eligible_reminder_count DESC, pending_count DESC
            LIMIT 3
        """, {"cooldown_after": cooldown_after})

        suggestions = []

        for row in rows:
            pending_count = int(row["pending_count"] or 0)
            eligible_count = int(row["eligible_reminder_count"] or 0)
            recently_reminded_count = int(row["recently_reminded_count"] or 0)

            suggestions.append({
                "type": "PENDING_INVITATIONS",
                "priority": "HIGH" if eligible_count >= 10 else "MEDIUM",
                "title": "Relancer les invités sans réponse",
                "insight": (
                    f"{pending_count} invitation(s) sont encore en attente pour cet événement, "
                    f"dont {eligible_count} relançable(s) maintenant. "
                    f"{recently_reminded_count} invitation(s) ont déjà été relancées récemment."
                ),
                "recommended_action": (
                    "Envoyer une relance uniquement aux collaborateurs déjà invités, "
                    "sans créer de nouvelle invitation."
                ),
                "action_type": "REMIND_PENDING_INVITATIONS",
                "related_event_id": row["event_id"],
                "related_event_title": row["event_title"],
                "metadata": {
                    "pending_count": pending_count,
                    "eligible_reminder_count": eligible_count,
                    "recently_reminded_count": recently_reminded_count,
                    "cooldown_hours": 24
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
    
    def _detect_low_engagement_departments(self) -> list[dict]:
        rows = self._read_rows("""
            SELECT
                d.id AS department_id,
                d.name AS department_name,
                COUNT(DISTINCT u.id) AS active_employees,
                COUNT(DISTINCT r.user_id) AS participating_users
            FROM departments d
            JOIN users u ON u.department_id = d.id AND u.is_active = true
            LEFT JOIN event_registrations r
                ON r.user_id = u.id
                AND r.status NOT IN ('CANCELLED', 'UNREGISTERED')
            GROUP BY d.id, d.name
            HAVING COUNT(DISTINCT u.id) >= 3
            AND (
                    COUNT(DISTINCT r.user_id)::float
                    / NULLIF(COUNT(DISTINCT u.id), 0)
            ) < 0.30
            ORDER BY (
                COUNT(DISTINCT r.user_id)::float
                / NULLIF(COUNT(DISTINCT u.id), 0)
            ) ASC
            LIMIT 2
        """)

        suggestions = []

        for row in rows:
            active_employees = int(row["active_employees"] or 0)
            participating_users = int(row["participating_users"] or 0)
            rate = participating_users / active_employees if active_employees > 0 else 0

            suggestions.append({
                "type": "LOW_DEPARTMENT_ENGAGEMENT",
                "priority": "HIGH" if rate < 0.15 else "MEDIUM",
                "title": "Renforcer l’engagement d’un département",
                "insight": (
                    f"Le département {row['department_name']} présente un taux de participation "
                    f"faible : {participating_users}/{active_employees} collaborateur(s), soit {round(rate * 100)}%."
                ),
                "recommended_action": "Proposer une action ciblée adaptée aux centres d’intérêt du département.",
                "related_event_id": None,
                "related_event_title": None,
                "metadata": {
                    "department_id": row["department_id"],
                    "department_name": row["department_name"],
                    "active_employees": active_employees,
                    "participating_users": participating_users,
                    "participation_rate": rate
                }
            })

        return suggestions

    def _detect_rsvp_friction_events(self) -> list[dict]:
        rows = self._read_rows("""
            SELECT
                e.id::text AS event_id,
                e.title AS event_title,

                COUNT(i.id) FILTER (
                    WHERE i.rsvp_response IN ('YES', 'MAYBE', 'NO')
                ) AS responded_count,

                COUNT(i.id) FILTER (
                    WHERE i.rsvp_response = 'YES'
                ) AS yes_count,

                COUNT(i.id) FILTER (
                    WHERE i.rsvp_response = 'MAYBE'
                ) AS maybe_count,

                COUNT(i.id) FILTER (
                    WHERE i.rsvp_response = 'NO'
                ) AS no_count

            FROM events e
            JOIN event_invitations i ON i.event_id = e.id
            WHERE e.status = 'PUBLISHED'
            AND e.start_at > NOW()
            GROUP BY e.id, e.title
            HAVING COUNT(i.id) FILTER (
                WHERE i.rsvp_response IN ('YES', 'MAYBE', 'NO')
            ) >= 3
            ORDER BY
                (
                    (
                        COUNT(i.id) FILTER (WHERE i.rsvp_response IN ('MAYBE', 'NO'))
                    )::float
                    / NULLIF(
                        COUNT(i.id) FILTER (WHERE i.rsvp_response IN ('YES', 'MAYBE', 'NO')),
                        0
                    )
                ) DESC
            LIMIT 3
        """)

        suggestions = []

        for row in rows:
            responded_count = int(row["responded_count"] or 0)
            yes_count = int(row["yes_count"] or 0)
            maybe_count = int(row["maybe_count"] or 0)
            no_count = int(row["no_count"] or 0)

            if responded_count == 0:
                continue

            friction_count = maybe_count + no_count
            friction_rate = friction_count / responded_count

            if friction_rate < 0.40:
                continue

            suggestions.append({
                "type": "RSVP_FRICTION",
                "priority": "HIGH" if friction_rate >= 0.60 else "MEDIUM",
                "title": "Comprendre les réponses négatives ou hésitantes",
                "insight": (
                    f"L’événement présente {friction_count}/{responded_count} réponse(s) "
                    f"négative(s) ou hésitante(s), soit {round(friction_rate * 100)}%. "
                    f"Détail : {no_count} non, {maybe_count} peut-être, {yes_count} oui."
                ),
                "recommended_action": (
                    "Analyser le positionnement de l’événement : créneau, sujet, format ou communication. "
                    "Une clarification du bénéfice participant peut améliorer l’adhésion."
                ),
                "action_type": "REVIEW_RSVP_FRICTION",
                "related_event_id": row["event_id"],
                "related_event_title": row["event_title"],
                "metadata": {
                    "responded_count": responded_count,
                    "yes_count": yes_count,
                    "maybe_count": maybe_count,
                    "no_count": no_count,
                    "friction_count": friction_count,
                    "friction_rate": friction_rate
                }
            })

        return suggestions

    def _rank_suggestions(self, suggestions: list[dict]) -> list[dict]:
        priority_score = {
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1
        }

        sorted_items = sorted(
            suggestions,
            key=lambda item: (
                priority_score.get(item["priority"], 0),
                item.get("metadata", {}).get("pending_count", 0),
                item.get("metadata", {}).get("registered_count", 0),
                item.get("metadata", {}).get("feedback_count", 0)
            ),
            reverse=True
        )

        selected = []
        used_types = set()

        for item in sorted_items:
            suggestion_type = item.get("type")

            if suggestion_type in used_types:
                continue

            selected.append(item)
            used_types.add(suggestion_type)

            if len(selected) >= 3:
                break

        return selected

    def _build_qwen_draft(self, suggestion: dict) -> tuple[str, bool, str]:
        fallback = self._build_fallback_draft(suggestion)

        system_message = (
            "Tu es un assistant RH pour CapEvents. "
            "Tu rédiges des messages courts, professionnels et en français. "
            "Tu n’inventes aucune donnée. "
            "Tu utilises uniquement les informations fournies."
        )

        user_message = f"""
        Écris uniquement le brouillon final du message RH.

        Contexte :
        - Type : {suggestion["type"]}
        - Priorité : {suggestion["priority"]}
        - Titre : {suggestion["title"]}
        - Constat : {suggestion["insight"]}
        - Action recommandée : {suggestion["recommended_action"]}
        - Événement concerné : {suggestion.get("related_event_title") or "Non précisé"}

        Règles :
        - Ne répète pas le prompt.
        - N’utilise pas de markdown.
        - N’écris pas "Type", "Priorité", "Constat" ou "Contraintes".
        - 3 phrases maximum.
        - Ton professionnel RH.
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
            bad_patterns = [
                "rédige un brouillon",
                "le brouillon final",
                "brouillon final du message",
                "améliorer le taux d’inscription pour",
                "comprendre les réponses négatives ou hésitantes pour",
                "type :",
                "priorité :",
                "constat :",
                "contraintes",
                "**"
            ]

            if any(pattern in text_response.lower() for pattern in bad_patterns):
                return fallback, False, "fallback_qwen_prompt_echo"

            if not text_response:
                return fallback, False, "fallback_empty_qwen_response"

            return text_response, True, "qwen3_ollama_chat"

        except Exception as exc:
            return fallback, False, f"fallback_ollama_error_{type(exc).__name__}"

    def _build_fallback_draft(self, suggestion: dict) -> str:
        event_title = suggestion.get("related_event_title")

        if suggestion["type"] == "PENDING_INVITATIONS":
            return (
                f"Bonjour, nous vous invitons à confirmer votre participation à l’événement "
                f"« {event_title} » afin de faciliter l’organisation. "
                f"Votre réponse permettra d’ajuster la logistique et de mieux anticiper la participation. "
                f"Merci de répondre dès que possible."
            )

        if suggestion["type"] == "LOW_REGISTRATION":
            return (
                f"Bonjour, l’événement « {event_title} » présente actuellement un niveau "
                f"d’inscription inférieur aux attentes. Nous recommandons de renforcer sa visibilité "
                f"auprès des collaborateurs concernés et de rappeler clairement les bénéfices de la participation. "
                f"Une relance ciblée peut aider à améliorer l’engagement avant la date de l’événement."
            )

        if suggestion["type"] == "LOW_FEEDBACK_SCORE":
            return (
                f"Les retours de l’événement « {event_title} » indiquent des axes d’amélioration. "
                f"Nous recommandons d’analyser les commentaires et d’ajuster l’organisation des prochains événements similaires."
            )
        
        if suggestion["type"] == "LOW_DEPARTMENT_ENGAGEMENT":
            department_name = suggestion.get("metadata", {}).get("department_name", "le département concerné")
            return (
                f"Bonjour, nous souhaitons renforcer la participation du département {department_name} "
                f"aux événements internes. Une action ciblée pourrait être proposée afin de mieux répondre "
                f"aux attentes des collaborateurs concernés. Nous recommandons d’identifier un format court "
                f"et adapté à leurs disponibilités."
            )
        
        if suggestion["type"] == "RSVP_FRICTION":
            event_title = suggestion.get("related_event_title") or "l’événement concerné"

            return (
                f"L’événement « {event_title} » présente un niveau important de réponses négatives "
                f"ou hésitantes. Nous recommandons d’analyser les causes possibles, notamment le créneau, "
                f"le format, le sujet ou la clarté de la communication. Une clarification des objectifs et "
                f"des bénéfices pour les participants peut aider à renforcer l’adhésion."
            )

        return suggestion["recommended_action"]