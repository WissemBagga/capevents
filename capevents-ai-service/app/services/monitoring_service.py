import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from app.schemas.monitoring import (
    RecentPrediction,
    RecommendationMonitoringSummary,
    TopRecommendedEvent
)


class MonitoringService:
    def __init__(self, log_dir: str = "logs/predictions") -> None:
        self.log_dir = Path(log_dir)

    def get_recommendation_summary(
        self,
        max_recent: int = 10,
        max_top_events: int = 10
    ) -> RecommendationMonitoringSummary:
        logs = self._read_recommendation_logs()

        if not logs:
            return RecommendationMonitoringSummary(
                total_calls=0,
                successful_calls=0,
                failed_calls=0,
                total_recommendations=0,
                last_model_name=None,
                last_model_version=None,
                top_recommended_events=[],
                recent_predictions=[]
            )

        total_calls = len(logs)
        successful_calls = sum(1 for item in logs if item.get("status") == "SUCCESS")
        failed_calls = total_calls - successful_calls

        total_recommendations = sum(
            len(item.get("recommendations", []))
            for item in logs
        )

        latest_log = sorted(
            logs,
            key=lambda item: item.get("created_at", ""),
            reverse=True
        )[0]

        top_events = self._build_top_recommended_events(
            logs=logs,
            limit=max_top_events
        )

        recent_predictions = self._build_recent_predictions(
            logs=logs,
            limit=max_recent
        )

        return RecommendationMonitoringSummary(
            total_calls=total_calls,
            successful_calls=successful_calls,
            failed_calls=failed_calls,
            total_recommendations=total_recommendations,
            last_model_name=latest_log.get("model_name"),
            last_model_version=latest_log.get("model_version"),
            top_recommended_events=top_events,
            recent_predictions=recent_predictions
        )

    def _read_recommendation_logs(self) -> list[dict[str, Any]]:
        if not self.log_dir.exists():
            return []

        log_files = sorted(
            self.log_dir.glob("recommendations-*.jsonl"),
            reverse=True
        )

        logs: list[dict[str, Any]] = []

        for log_file in log_files:
            with log_file.open("r", encoding="utf-8") as file:
                for line in file:
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        payload = json.loads(line)
                        logs.append(payload)
                    except json.JSONDecodeError:
                        continue

        return logs

    def _build_top_recommended_events(
        self,
        logs: list[dict[str, Any]],
        limit: int
    ) -> list[TopRecommendedEvent]:
        counter: Counter[str] = Counter()
        metadata: dict[str, dict[str, str | None]] = defaultdict(dict)

        for log in logs:
            for recommendation in log.get("recommendations", []):
                event_id = str(recommendation.get("event_id", ""))

                if not event_id:
                    continue

                counter[event_id] += 1

                metadata[event_id] = {
                    "title": recommendation.get("title"),
                    "category": recommendation.get("category")
                }

        results: list[TopRecommendedEvent] = []

        for event_id, count in counter.most_common(limit):
            results.append(
                TopRecommendedEvent(
                    event_id=event_id,
                    title=metadata[event_id].get("title"),
                    category=metadata[event_id].get("category"),
                    count=count
                )
            )

        return results

    def _build_recent_predictions(
        self,
        logs: list[dict[str, Any]],
        limit: int
    ) -> list[RecentPrediction]:
        recent_logs = sorted(
            logs,
            key=lambda item: item.get("created_at", ""),
            reverse=True
        )[:limit]

        results: list[RecentPrediction] = []

        for item in recent_logs:
            recommendations = item.get("recommendations", [])

            results.append(
                RecentPrediction(
                    request_id=str(item.get("request_id", "")),
                    created_at=str(item.get("created_at", "")),
                    user_id=str(item.get("user_id", "")),
                    status=str(item.get("status", "")),
                    model_name=str(item.get("model_name", "")),
                    model_version=str(item.get("model_version", "")),
                    total_candidates=int(item.get("total_candidates", 0)),
                    recommendations_count=len(recommendations)
                )
            )

        return results