import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class PredictionLogger:
    def __init__(self, log_dir: str = "logs/predictions") -> None:
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def log_recommendation(
        self,
        request_id: str,
        user_id: str,
        model_name: str,
        model_version: str,
        total_candidates: int,
        recommendations: list[dict[str, Any]],
        status: str,
        message: str | None = None
    ) -> None:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_file = self.log_dir / f"recommendations-{today}.jsonl"

        payload = {
            "request_id": request_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "RECOMMENDATION",
            "status": status,
            "user_id": user_id,
            "model_name": model_name,
            "model_version": model_version,
            "total_candidates": total_candidates,
            "recommendations": recommendations,
            "message": message
        }

        with log_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(payload, ensure_ascii=False) + "\n")