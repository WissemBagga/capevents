from pathlib import Path

import requests

from app.data.runtime_loader import (
    load_runtime_users,
    load_runtime_events,
    load_runtime_registrations,
    load_runtime_feedbacks,
    load_runtime_invitations
)

from app.schemas.diagnostics import AiDiagnosticsResponse


MODEL_PATH = Path("models_artifacts/recommendation/catboost_recommender.cbm")
FEATURES_PATH = Path("models_artifacts/recommendation/features.json")

MODEL_NAME = "catboost_recommender"
MODEL_VERSION = "recommendation-v1.0.0"

OLLAMA_BASE_URL = "http://127.0.0.1:11434"
OLLAMA_MODEL = "qwen3:0.6b"


class DiagnosticsService:
    def get_status(self) -> AiDiagnosticsResponse:
        model_loaded = MODEL_PATH.exists()
        features_loaded = FEATURES_PATH.exists()

        features_count = 0
        categorical_features_count = 0

        if features_loaded:
            import json

            with FEATURES_PATH.open("r", encoding="utf-8") as file:
                metadata = json.load(file)

            features_count = len(metadata.get("features", []))
            categorical_features_count = len(metadata.get("categorical_features", []))

        users = load_runtime_users()
        events = load_runtime_events()
        registrations = load_runtime_registrations()
        feedbacks = load_runtime_feedbacks()
        invitations = load_runtime_invitations()

        published_events_count = 0

        if not events.empty and "status" in events.columns:
            published_events_count = int(
                events["status"]
                .fillna("")
                .astype(str)
                .str.upper()
                .eq("PUBLISHED")
                .sum()
            )

        ollama_available = self._is_ollama_available()

        status = "UP"

        if not model_loaded or not features_loaded:
            status = "DEGRADED"

        return AiDiagnosticsResponse(
            status=status,
            model_loaded=model_loaded,
            features_loaded=features_loaded,
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            features_count=features_count,
            categorical_features_count=categorical_features_count,

            runtime_users_count=int(len(users)),
            runtime_events_count=int(len(events)),
            runtime_published_events_count=published_events_count,
            runtime_registrations_count=int(len(registrations)),
            runtime_feedbacks_count=int(len(feedbacks)),
            runtime_invitations_count=int(len(invitations)),

            ollama_available=ollama_available,
            ollama_model=OLLAMA_MODEL,
            message=self._build_message(
                model_loaded=model_loaded,
                features_loaded=features_loaded,
                ollama_available=ollama_available
            )
        )

    def _is_ollama_available(self) -> bool:
        try:
            response = requests.get(
                OLLAMA_BASE_URL,
                timeout=3
            )

            return response.status_code == 200

        except Exception:
            return False

    def _build_message(
        self,
        model_loaded: bool,
        features_loaded: bool,
        ollama_available: bool
    ) -> str:
        issues = []

        if not model_loaded:
            issues.append("modèle CatBoost introuvable")

        if not features_loaded:
            issues.append("fichier features introuvable")

        if not ollama_available:
            issues.append("Ollama indisponible")

        if not issues:
            return "AI service operational."

        return "AI service operational with warnings: " + ", ".join(issues)