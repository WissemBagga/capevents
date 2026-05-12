import json
from pathlib import Path
from typing import Any

import requests

from app.core.config import settings
from app.core.model_registry import (
    ModelRegistryError,
    get_active_model_metadata,
    read_model_registry,
    resolve_registry_path,
)
from app.data.db import test_database_connection
from app.data.repositories.analytics_repository import (
    count_invitations,
    count_registrations,
)
from app.data.repositories.event_repository import (
    count_events,
    count_published_events,
)
from app.data.repositories.feedback_repository import count_feedbacks
from app.data.repositories.user_repository import count_active_users
from app.schemas.diagnostics import AiDiagnosticsResponse


class DiagnosticsService:
    def get_status(self) -> AiDiagnosticsResponse:
        database_available = test_database_connection()

        runtime_counts = self._get_runtime_counts(database_available)
        registry_status = self._get_recommendation_model_status()
        ollama_available = self._is_ollama_available()

        status = self._build_status(
            database_available=database_available,
            model_loaded=registry_status["model_loaded"],
            features_loaded=registry_status["features_loaded"],
        )

        return AiDiagnosticsResponse(
            status=status,
            database_available=database_available,
            model_registry_available=registry_status["model_registry_available"],
            active_models=registry_status["active_models"],
            model_loaded=registry_status["model_loaded"],
            features_loaded=registry_status["features_loaded"],
            model_name=registry_status["model_name"],
            model_version=registry_status["model_version"],
            features_count=registry_status["features_count"],
            categorical_features_count=registry_status["categorical_features_count"],
            runtime_users_count=runtime_counts["users"],
            runtime_events_count=runtime_counts["events"],
            runtime_published_events_count=runtime_counts["published_events"],
            runtime_registrations_count=runtime_counts["registrations"],
            runtime_feedbacks_count=runtime_counts["feedbacks"],
            runtime_invitations_count=runtime_counts["invitations"],
            ollama_available=ollama_available,
            ollama_model=settings.ollama_model,
            message=self._build_message(
                database_available=database_available,
                model_loaded=registry_status["model_loaded"],
                features_loaded=registry_status["features_loaded"],
                ollama_available=ollama_available,
            ),
        )

    def _get_runtime_counts(self, database_available: bool) -> dict[str, int]:
        if not database_available:
            return {
                "users": 0,
                "events": 0,
                "published_events": 0,
                "registrations": 0,
                "feedbacks": 0,
                "invitations": 0,
            }

        try:
            return {
                "users": count_active_users(),
                "events": count_events(),
                "published_events": count_published_events(),
                "registrations": count_registrations(),
                "feedbacks": count_feedbacks(),
                "invitations": count_invitations(),
            }
        except Exception:
            return {
                "users": 0,
                "events": 0,
                "published_events": 0,
                "registrations": 0,
                "feedbacks": 0,
                "invitations": 0,
            }

    def _get_recommendation_model_status(self) -> dict[str, Any]:
        try:
            registry = read_model_registry()
            active_models = [
                task
                for task, entry in registry.get("models", {}).items()
                if entry.get("active_version")
            ]

            metadata = get_active_model_metadata(settings.recommendation_model_task)

            model_path = resolve_registry_path(
                metadata.get("artifact_path") or metadata.get("model_path"),
                required=False,
            )
            features_path = resolve_registry_path(
                metadata.get("features_path"),
                required=False,
            )

            features_count = 0
            categorical_features_count = 0

            if features_path and Path(features_path).exists():
                with Path(features_path).open("r", encoding="utf-8") as file:
                    features_metadata = json.load(file)

                features_count = len(features_metadata.get("features", []))
                categorical_features_count = len(
                    features_metadata.get("categorical_features", [])
                )

            return {
                "model_registry_available": True,
                "active_models": active_models,
                "model_loaded": bool(model_path and Path(model_path).exists()),
                "features_loaded": bool(features_path and Path(features_path).exists()),
                "model_name": metadata.get("model_name", "recommendation_model"),
                "model_version": metadata.get("version", metadata.get("model_version", "unknown")),
                "features_count": features_count,
                "categorical_features_count": categorical_features_count,
            }

        except ModelRegistryError:
            return self._empty_model_status()

        except Exception:
            return self._empty_model_status()

    def _empty_model_status(self) -> dict[str, Any]:
        return {
            "model_registry_available": False,
            "active_models": [],
            "model_loaded": False,
            "features_loaded": False,
            "model_name": "unknown",
            "model_version": "unknown",
            "features_count": 0,
            "categorical_features_count": 0,
        }

    def _is_ollama_available(self) -> bool:
        try:
            response = requests.get(
                settings.ollama_base_url,
                timeout=3,
            )
            return response.status_code == 200
        except Exception:
            return False

    def _build_status(
        self,
        database_available: bool,
        model_loaded: bool,
        features_loaded: bool,
    ) -> str:
        if not database_available:
            return "DOWN"

        if not model_loaded or not features_loaded:
            return "DEGRADED"

        return "UP"

    def _build_message(
        self,
        database_available: bool,
        model_loaded: bool,
        features_loaded: bool,
        ollama_available: bool,
    ) -> str:
        issues = []

        if not database_available:
            issues.append("database unavailable")

        if not model_loaded:
            issues.append("recommendation model artifact unavailable")

        if not features_loaded:
            issues.append("recommendation features metadata unavailable")

        if not ollama_available:
            issues.append("Ollama unavailable")

        if not issues:
            return "AI service operational."

        return "AI service operational with warnings: " + ", ".join(issues)