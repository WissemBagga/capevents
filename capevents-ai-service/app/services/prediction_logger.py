import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class PredictionLogger:
    def __init__(self, log_dir: str = "logs/predictions") -> None:
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def _write_jsonl(self, prefix: str, payload: dict[str, Any]) -> None:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_file = self.log_dir / f"{prefix}-{today}.jsonl"

        with log_file.open("a", encoding="utf-8") as file:
            file.write(json.dumps(payload, ensure_ascii=False, default=str) + "\n")

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
        payload = {
            "request_id": request_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "logged_at": datetime.now(timezone.utc).isoformat(),
            "type": "RECOMMENDATION",
            "status": status,
            "user_id": user_id,
            "model_name": model_name,
            "model_version": model_version,
            "total_candidates": total_candidates,
            "recommendations": recommendations,
            "message": message
        }

        self._write_jsonl("recommendations", payload)

    def log_planning(
        self,
        event_type: str,
        request_id: str | None = None,
        action: str | None = None,
        proposal_rank: int | None = None,
        proposal_title: str | None = None,
        category: str | None = None,
        target_department_id: int | str | None = None,
        selected_slot_start_at: str | None = None,
        selected_slot_score: float | None = None,
        created_event_id: str | None = None,
        created_event_status: str | None = None,
        model_info: dict[str, Any] | None = None,
        total_proposals: int | None = None,
        total_candidates: int | None = None,
        returned_items: int | None = None,
        source: str | None = None,
        payload: dict[str, Any] | None = None
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()

        record = {
            "request_id": request_id,
            "created_at": now,
            "logged_at": now,
            "type": "PLANNING",
            "event_type": event_type,
            "action": action,
            "proposal_rank": proposal_rank,
            "proposal_title": proposal_title,
            "category": category,
            "target_department_id": target_department_id,
            "selected_slot_start_at": selected_slot_start_at,
            "selected_slot_score": selected_slot_score,
            "created_event_id": created_event_id,
            "created_event_status": created_event_status,
            "model_info": model_info,
            "total_proposals": total_proposals,
            "total_candidates": total_candidates,
            "returned_items": returned_items,
            "source": source
        }

        if payload:
            record.update(payload)

        self._write_jsonl("planning", record)