import json
from typing import Any

import pandas as pd

from app.services.planning_llm_client import PlanningLlmClient, PlanningLlmError


ALLOWED_LOCATION_TYPES = {"ONSITE", "ONLINE", "EXTERNAL"}
ALLOWED_AUDIENCES = {"GLOBAL", "DEPARTMENT"}

ALLOWED_CATEGORIES = {
    "Formation",
    "Conférence",
    "Atelier",
    "Webinaire",
    "Team building",
    "Culture d’entreprise",
    "Bien-être",
    "Innovation",
    "Networking",
    "Afterwork",
    "RSE",
    "Sport"
}

CATEGORY_ALIASES = {
    "FORMATION": "Formation",
    "CONFERENCE": "Conférence",
    "CONFÉRENCE": "Conférence",
    "CONFÉREMENT": "Conférence",
    "CONFÉRENCEMENT": "Conférence",
    "ATELIER": "Atelier",
    "WORKSHOP": "Atelier",
    "WEBINAIRE": "Webinaire",
    "WEBINAR": "Webinaire",
    "LIVE": "Webinaire",
    "TEAM BUILDING": "Team building",
    "TEAMBUILDING": "Team building",
    "CULTURE": "Culture d’entreprise",
    "CULTURE D’ENTREPRISE": "Culture d’entreprise",
    "CULTURE D'ENTREPRISE": "Culture d’entreprise",
    "BIEN-ÊTRE": "Bien-être",
    "BIEN ETRE": "Bien-être",
    "BIEN-ETRE": "Bien-être",
    "INNOVATION": "Innovation",
    "NETWORKING": "Networking",
    "RESEAU": "Networking",
    "RÉSEAU": "Networking",
    "AFTERWORK": "Afterwork",
    "RSE": "RSE",
    "SPORT": "Sport"
}

FORBIDDEN_TITLE_TERMS = {
    "concours",
    "football",
    "tennis",
    "match",
    "tournoi scolaire",
    "sciences"
}

GENERIC_TEXT_VALUES = {
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

GENERIC_SIGNAL_VALUES = {
    "signal",
    "signal-1",
    "signal-2",
    "signal de données",
    "signal de données 1",
    "signal de données 2",
    "donnée 1",
    "donnée 2",
    "data signal",
    "data signal 1",
    "signaux positifs",
    "participer",
    "participation",
    "collaboration",
    "partage"
}


MOJIBAKE_REPLACEMENTS = {
    "Ã©": "é",
    "Ã¨": "è",
    "Ãª": "ê",
    "Ã ": "à",
    "Ã´": "ô",
    "Ã®": "î",
    "Ã§": "ç",
    "Ã‰": "É",
    "â€™": "’",
    "Â«": "«",
    "Â»": "»",
    "ConfÃ©rence": "Conférence",
    "Bien-Ãªtre": "Bien-être",
    "Culture dâ€™entreprise": "Culture d’entreprise",
    "amÃ©lioration": "amélioration",
    "Ã©quipes": "équipes",
    "inter-Ã©quipes": "inter-équipes",
    "matiÃ¨re": "matière",
    "qualitÃ©": "qualité",
    "numÃ©riques": "numériques",
    "rÃ©el": "réel",
    "compÃ©tences": "compétences",
}


def clean_generated_text(value: object) -> str:
    text = str(value or "").strip()

    if not text:
        return ""

    if any(marker in text for marker in ["Ã", "â", "Â"]):
        try:
            text = text.encode("cp1252").decode("utf-8")
        except Exception:
            pass

    for old, new in MOJIBAKE_REPLACEMENTS.items():
        text = text.replace(old, new)

    return text.strip()


def clean_generated_list(values: object) -> list[str]:
    if not isinstance(values, list):
        values = [values]

    return [
        cleaned
        for item in values
        if (cleaned := clean_generated_text(item))
    ]


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
                user_prompt=self._user_prompt(
                    context=context,
                    limit=concept_count
                )
            )

            concepts = response.get("concepts", [])

            clean = self._validate_concepts(
                concepts=concepts,
                target_department_id=target_department_id,
                users=users
            )

            minimum_required = min(max(limit, 3), 5)

            if len(clean) < minimum_required:
                retry_response = self.llm_client.generate_json(
                    system_prompt=self._system_prompt(),
                    user_prompt=self._user_prompt(
                        context={
                            **context,
                            "quality_instruction": (
                                "La génération précédente contient trop peu de concepts valides. "
                                "Génère uniquement des événements RH internes professionnels, "
                                "avec des titres précis, des catégories autorisées et des objectifs exploitables."
                            )
                        },
                        limit=minimum_required
                    )
                )

                retry_concepts = retry_response.get("concepts", [])

                retry_clean = self._validate_concepts(
                    concepts=retry_concepts,
                    target_department_id=target_department_id,
                    users=users
                )

                existing_titles = {item["title"].lower() for item in clean}

                for item in retry_clean:
                    title_key = item["title"].lower()

                    if title_key not in existing_titles:
                        clean.append(item)
                        existing_titles.add(title_key)

                    if len(clean) >= minimum_required:
                        break

            if len(clean) < minimum_required:
                clean = self._supplement_missing_concepts(
                    concepts=clean,
                    target_department_id=target_department_id,
                    users=users,
                    required_count=minimum_required,
                    reason="llm_returned_less_valid_concepts_than_requested"
                )

            if len(clean) == 0:
                clean = self._supplement_missing_concepts(
                    concepts=[],
                    target_department_id=target_department_id,
                    users=users,
                    required_count=minimum_required,
                    reason="llm_returned_no_valid_concept"
                )

            return clean[:minimum_required]

            return clean[:minimum_required]

        except Exception as exception:
            self.last_error = str(exception)

            required_count = min(max(limit, 3), 5)

            return self._supplement_missing_concepts(
                concepts=[],
                target_department_id=target_department_id,
                users=users,
                required_count=required_count,
                reason=f"llm_generation_failed: {self.last_error}"
            )

    def _system_prompt(self) -> str:
        return """
/no_think
Tu es un assistant IA RH pour CapEvents.

Réponds uniquement avec un JSON valide.
Aucun texte hors JSON.
Aucune explication.
Aucune balise markdown.
Aucun lien.
Aucune adresse.
Aucune salle.

Les propositions doivent être professionnelles, internes, RH, exploitables et adaptées à une entreprise.
"""

    def _user_prompt(self, context: dict[str, Any], limit: int) -> str:
        compact_context = {
            "scope": context.get("scope"),
            "data_quality": context.get("data_quality"),
            "observed_categories": context.get("observed_categories", [])[:6],
            "category_summary": context.get("category_summary", [])[:5],
            "category_diversity_pool": [
                "Formation",
                "Conférence",
                "Atelier",
                "Webinaire",
                "Team building",
                "Culture d’entreprise",
                "Bien-être",
                "Innovation",
                "Networking",
                "Afterwork",
                "RSE",
                "Sport"
            ],
            "quality_instruction": context.get("quality_instruction")
        }

        return f"""
/no_think
Génère exactement {limit} idées d’événements internes RH.

Réponds uniquement avec ce format JSON compact :
{{
  "concepts": [
    {{
      "t": "titre professionnel précis",
      "c": "catégorie autorisée",
      "a": "GLOBAL",
      "l": "ONSITE",
      "d": 60,
      "cap": 30,
      "o": "objectif professionnel clair",
      "r": ["raison métier 1", "raison métier 2"],
      "s": ["signal de données 1"]
    }}
  ]
}}

Catégories autorisées exactement :
Formation, Conférence, Atelier, Webinaire, Team building, Culture d’entreprise, Bien-être, Innovation, Networking, Afterwork, RSE, Sport.

Contraintes :
- t maximum 55 caractères.
- t doit être professionnel et spécifique.
- o maximum 140 caractères.
- r contient exactement 2 raisons professionnelles.
- s contient maximum 2 signaux concrets.
- a vaut GLOBAL ou DEPARTMENT.
- l vaut ONSITE, ONLINE ou EXTERNAL.
- Webinaire doit être ONLINE.
- Pas de concours, football, tennis, match, sciences ou activité scolaire.
- Pas de lien.
- Pas d’adresse.
- Pas de salle.
- Pas de texte hors JSON.

Exemples de style attendu :
- "Atelier amélioration continue inter-équipes"
- "Webinaire pratiques digitales et collaboration"
- "Table ronde retours terrain et bonnes pratiques"
- "Session innovation opérationnelle et idées terrain"

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

        if "category" not in df.columns:
            df["category"] = "Autre"

        if "title" not in df.columns:
            df["title"] = ""

        df["category"] = df["category"].fillna("Autre").astype(str)
        df["title"] = df["title"].fillna("").astype(str)

        for column in [
            "registration_rate",
            "attendance_rate",
            "average_rating",
            "capacity",
            "duration_minutes",
            "invitation_count"
        ]:
            if column not in df.columns:
                df[column] = 0

            df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

        if "event_id" not in df.columns:
            df["event_id"] = df.index.astype(str)

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

        available_cols = [column for column in recent_cols if column in df.columns]

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

            title = clean_generated_text(item.get("title") or item.get("t") or "")

            raw_category = clean_generated_text(item.get("category") or item.get("c") or "")
            category = self._normalize_category(raw_category)

            if category is None:
                continue

            category = self._infer_category_from_title(
                title=title,
                current_category=category
            )

            if not self._is_professional_title(title):
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

            location_type = self._preferred_location_for_category(
                category=category,
                current_location=location_type
            )

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

            rationale = clean_generated_list(item.get("rationale") or item.get("r") or [])

            data_signals = clean_generated_list(item.get("data_signals") or item.get("s") or [])

            data_signals = self._clean_data_signals(data_signals)

            objective = self._normalize_objective(
                objective=clean_generated_text(item.get("objective") or item.get("o") or ""),
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
                "category": category,
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
                    "data_signals": data_signals
                }
            })

        return clean

    def _normalize_category(self, value: str) -> str | None:
        raw = str(value or "").strip()

        if not raw:
            return None

        if raw in ALLOWED_CATEGORIES:
            return raw

        upper = raw.upper().strip()

        if upper in CATEGORY_ALIASES:
            return CATEGORY_ALIASES[upper]

        normalized = (
            upper
            .replace("É", "E")
            .replace("È", "E")
            .replace("Ê", "E")
            .replace("À", "A")
            .replace("’", "'")
        )

        for key, category in CATEGORY_ALIASES.items():
            key_normalized = (
                key.upper()
                .replace("É", "E")
                .replace("È", "E")
                .replace("Ê", "E")
                .replace("À", "A")
                .replace("’", "'")
            )

            if normalized == key_normalized:
                return category

        return None

    def _infer_category_from_title(
        self,
        title: str,
        current_category: str
    ) -> str:
        text = str(title or "").lower()

        if "webinaire" in text or "webinar" in text or text.startswith("live "):
            return "Webinaire"

        if "bien-être" in text or "bien etre" in text or "stress" in text or "santé mentale" in text:
            return "Bien-être"

        if "team building" in text or "cohésion" in text:
            return "Team building"

        if "innovation" in text or "idéation" in text or "créativité" in text:
            return "Innovation"

        if "networking" in text or "réseau" in text:
            return "Networking"

        if "afterwork" in text:
            return "Afterwork"

        if "rse" in text or "responsabilité" in text:
            return "RSE"

        if "formation" in text or "apprentissage" in text:
            return "Formation"

        if "conférence" in text or "table ronde" in text:
            return "Conférence"

        if "atelier" in text or "workshop" in text:
            return "Atelier"

        return current_category

    def _preferred_location_for_category(
        self,
        category: str,
        current_location: str
    ) -> str:
        normalized = str(category or "").strip().lower()

        if normalized == "webinaire":
            return "ONLINE"

        if normalized in {"afterwork", "team building", "sport", "bien-être", "culture d’entreprise"}:
            return "ONSITE"

        if normalized in {"formation", "conférence"}:
            return current_location if current_location in {"ONLINE", "ONSITE"} else "ONSITE"

        return current_location if current_location in ALLOWED_LOCATION_TYPES else "ONSITE"

    def _is_professional_title(self, title: str) -> bool:
        text = str(title or "").strip()

        if self._is_low_quality_text(text, min_words=3):
            return False

        if len(text) < 12:
            return False

        if self._has_forbidden_title_terms(text):
            return False

        return True

    def _has_forbidden_title_terms(self, title: str) -> bool:
        text = str(title or "").strip().lower()

        return any(term in text for term in FORBIDDEN_TITLE_TERMS)

    def _is_low_quality_text(self, value: str, min_words: int = 4) -> bool:
        text = str(value or "").strip().lower()

        if not text:
            return True

        words = [
            word
            for word in text.replace("-", " ").split()
            if word.strip()
        ]

        if len(words) < min_words:
            return True

        return text in GENERIC_TEXT_VALUES

    def _normalize_objective(
        self,
        objective: str,
        title: str,
        category: str
    ) -> str:
        if not self._is_low_quality_text(objective, min_words=7):
            return objective.strip()

        return (
            f"Organiser un événement interne de type {category.lower()} autour de « {title} » "
            "afin de renforcer l’engagement, le partage de connaissances et la collaboration entre collaborateurs."
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

        if data_signals:
            signal_text = ", ".join(str(signal) for signal in data_signals[:2])
        else:
            signal_text = "les données récentes disponibles"

        return [
            f"La catégorie {category} ressort comme une piste exploitable à partir de {signal_text}.",
            "Le format proposé reste à valider par le RH ou le manager avant publication.",
            "Le créneau sera ensuite optimisé par le modèle de planning et les contraintes calendrier."
        ]

    def _clean_data_signals(self, data_signals: list) -> list[str]:
        clean: list[str] = []

        for signal in data_signals:
            value = str(signal or "").strip()
            value_lower = value.lower()

            if not value:
                continue

            if value_lower in GENERIC_SIGNAL_VALUES:
                continue

            if value_lower.startswith("signal de données"):
                continue

            if value_lower.startswith("signal-"):
                continue

            if len(value.split()) < 3:
                continue

            clean.append(value)

        return clean[:5]

    def _default_capacity(
        self,
        users: pd.DataFrame,
        target_department_id: int | None
    ) -> int:
        if users is None or users.empty:
            return 30

        if target_department_id is None or "department_id" not in users.columns:
            return min(60, max(20, int(len(users) * 0.15)))

        data = users.copy()
        data["department_id"] = pd.to_numeric(
            data["department_id"],
            errors="coerce"
        ).fillna(0).astype(int)

        department_size = len(
            data[data["department_id"] == int(target_department_id)]
        )

        if department_size <= 0:
            return 30

        return min(80, max(15, int(department_size * 0.35)))

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

    def _supplement_missing_concepts(
        self,
        concepts: list[dict[str, Any]],
        target_department_id: int | None,
        users: pd.DataFrame,
        required_count: int,
        reason: str
    ) -> list[dict[str, Any]]:
        existing_titles = {
            str(item.get("title", "")).lower()
            for item in concepts
        }

        existing_categories = {
            str(item.get("category", "")).lower()
            for item in concepts
        }

        audience = "DEPARTMENT" if target_department_id else "GLOBAL"
        capacity = self._default_capacity(users, target_department_id)

        fallback_candidates = [
            {
                "title": "Atelier amélioration continue inter-équipes",
                "category": "Atelier",
                "location_type": "ONSITE",
                "objective": "Identifier des pistes d’amélioration concrètes et renforcer la collaboration entre équipes.",
                "rationale": [
                    "Le format atelier permet d’exploiter les retours récents même lorsque les données sont limitées.",
                    "La proposition reste à valider par le RH ou le manager avant publication."
                ]
            },
            {
                "title": "Webinaire pratiques digitales et collaboration",
                "category": "Webinaire",
                "location_type": "ONLINE",
                "objective": "Partager des pratiques digitales utiles pour améliorer la collaboration et l’efficacité professionnelle.",
                "rationale": [
                    "Le format en ligne facilite la participation des collaborateurs de plusieurs périmètres.",
                    "Le créneau sera optimisé par le modèle de planning selon les disponibilités futures."
                ]
            },
            {
                "title": "Session innovation opérationnelle et idées terrain",
                "category": "Innovation",
                "location_type": "ONSITE",
                "objective": "Faire émerger des idées concrètes à partir des besoins terrain et des signaux récents.",
                "rationale": [
                    "L’innovation collaborative permet de transformer les retours des équipes en actions utiles.",
                    "La proposition doit être validée avant publication pour garantir son alignement métier."
                ]
            },
            {
                "title": "Rencontre culture interne et engagement",
                "category": "Culture d’entreprise",
                "location_type": "ONSITE",
                "objective": "Renforcer l’engagement des collaborateurs autour des valeurs et pratiques internes.",
                "rationale": [
                    "Le format favorise l’adhésion et la compréhension des priorités internes.",
                    "Cette proposition complète les recommandations issues de la semaine précédente."
                ]
            },
            {
                "title": "Atelier bien-être et équilibre professionnel",
                "category": "Bien-être",
                "location_type": "ONSITE",
                "objective": "Soutenir le bien-être des collaborateurs avec un format court, accessible et participatif.",
                "rationale": [
                    "Le bien-être peut soutenir l’engagement et la disponibilité des collaborateurs.",
                    "Le créneau sera sélectionné selon les contraintes calendrier et les signaux historiques."
                ]
            },
            {
                "title": "Table ronde retours terrain et bonnes pratiques",
                "category": "Conférence",
                "location_type": "ONSITE",
                "objective": "Capitaliser sur les expériences récentes et partager des bonnes pratiques entre collaborateurs.",
                "rationale": [
                    "Les retours terrain permettent d’orienter les prochains événements vers des besoins concrets.",
                    "La validation RH ou manager reste nécessaire avant publication."
                ]
            },
            {
                "title": "Formation gestion du changement",
                "category": "Formation",
                "location_type": "ONSITE",
                "objective": "Accompagner les collaborateurs dans l’adaptation aux changements organisationnels.",
                "rationale": [
                    "La formation permet de répondre à un besoin professionnel transversal.",
                    "Le modèle de planning proposera ensuite les créneaux les plus adaptés."
                ]
            }
        ]

        for candidate in fallback_candidates:
            title_key = candidate["title"].lower()
            category_key = candidate["category"].lower()

            if title_key in existing_titles:
                continue

            # On essaie d'abord de diversifier les catégories.
            if category_key in existing_categories and len(concepts) < required_count - 1:
                continue

            concepts.append({
                "title": candidate["title"],
                "category": candidate["category"],
                "audience": audience,
                "location_type": candidate["location_type"],
                "target_department_id": target_department_id,
                "duration_minutes": 60,
                "capacity": capacity,
                "objective": candidate["objective"],
                "rationale": candidate["rationale"],
                "metrics": {
                    "source": "data_guardrail_supplement",
                    "data_confidence": "LOW",
                    "supplement_reason": reason
                }
            })

            existing_titles.add(title_key)
            existing_categories.add(category_key)

            if len(concepts) >= required_count:
                break

        return concepts[:required_count]