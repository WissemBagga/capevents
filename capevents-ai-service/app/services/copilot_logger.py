import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


LOG_DIR = Path("logs/copilot")


class CopilotLogger:
    def __init__(self) -> None:
        LOG_DIR.mkdir(parents=True, exist_ok=True)

    def log_hr_copilot(
        self,
        request_id: str,
        suggestions: list[dict[str, Any]],
        qwen_used: bool,
        summary_source: str,
        status: str = "SUCCESS",
        message: str | None = None
    ) -> None:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        log_path = LOG_DIR / f"hr-copilot-{today}.jsonl"

        payload = {
            "request_id": request_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "suggestions_count": len(suggestions),
            "suggestion_types": [
                suggestion.get("type")
                for suggestion in suggestions
            ],
            "related_event_ids": [
                suggestion.get("related_event_id")
                for suggestion in suggestions
                if suggestion.get("related_event_id")
            ],
            "qwen_used": qwen_used,
            "summary_source": summary_source,
            "status": status,
            "message": message
        }

        with log_path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(payload, ensure_ascii=False) + "\n")