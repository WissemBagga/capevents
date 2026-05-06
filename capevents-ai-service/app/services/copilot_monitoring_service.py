import json
from collections import Counter
from pathlib import Path
from typing import Any

from app.schemas.copilot_monitoring import (
    CopilotRecentCall,
    CopilotSuggestionTypeSummary,
    HrCopilotMonitoringResponse
)


LOG_DIR = Path("logs/copilot")


class CopilotMonitoringService:
    def get_hr_copilot_summary(self, limit: int = 10) -> HrCopilotMonitoringResponse:
        records = self._read_records()

        feedback_records = self._read_feedback_records()

        feedback_count = len(feedback_records)

        useful_feedback_count = sum(
            1 for item in feedback_records
            if bool(item.get("useful")) is True
        )

        not_useful_feedback_count = sum(
            1 for item in feedback_records
            if bool(item.get("useful")) is False
        )

        usefulness_rate = (
            useful_feedback_count / feedback_count
            if feedback_count > 0
            else 0.0
        )

        total_calls = len(records)
        successful_calls = sum(1 for item in records if item.get("status") == "SUCCESS")
        failed_calls = sum(1 for item in records if item.get("status") == "FAILED")

        total_suggestions = sum(
            int(item.get("suggestions_count") or 0)
            for item in records
        )

        qwen_used_count = sum(
            1 for item in records
            if bool(item.get("qwen_used"))
        )

        qwen_usage_rate = (
            qwen_used_count / total_calls
            if total_calls > 0
            else 0.0
        )

        suggestion_type_counter = Counter()

        for item in records:
            for suggestion_type in item.get("suggestion_types") or []:
                if suggestion_type:
                    suggestion_type_counter[str(suggestion_type)] += 1

        top_suggestion_types = [
            CopilotSuggestionTypeSummary(
                type=suggestion_type,
                count=count
            )
            for suggestion_type, count in suggestion_type_counter.most_common(8)
        ]

        recent_records = sorted(
            records,
            key=lambda item: str(item.get("created_at") or ""),
            reverse=True
        )[:limit]

        recent_calls = [
            self._to_recent_call(item)
            for item in recent_records
        ]

        return HrCopilotMonitoringResponse(
            total_calls=total_calls,
            successful_calls=successful_calls,
            failed_calls=failed_calls,
            total_suggestions=total_suggestions,
            qwen_used_count=qwen_used_count,
            qwen_usage_rate=round(qwen_usage_rate, 4),

            feedback_count=feedback_count,
            useful_feedback_count=useful_feedback_count,
            not_useful_feedback_count=not_useful_feedback_count,
            usefulness_rate=round(usefulness_rate, 4),

            top_suggestion_types=top_suggestion_types,
            recent_calls=recent_calls
        )

    def _read_records(self) -> list[dict[str, Any]]:
        if not LOG_DIR.exists():
            return []

        records: list[dict[str, Any]] = []

        for path in sorted(LOG_DIR.glob("hr-copilot-*.jsonl")):
            with path.open("r", encoding="utf-8") as file:
                for line in file:
                    line = line.strip()

                    if not line:
                        continue

                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

        return records

    def _to_recent_call(self, item: dict[str, Any]) -> CopilotRecentCall:
        return CopilotRecentCall(
            request_id=str(item.get("request_id") or ""),
            created_at=str(item.get("created_at") or ""),
            suggestions_count=int(item.get("suggestions_count") or 0),
            suggestion_types=[
                str(value)
                for value in item.get("suggestion_types") or []
                if value
            ],
            related_event_ids=[
                str(value)
                for value in item.get("related_event_ids") or []
                if value
            ],
            qwen_used=bool(item.get("qwen_used")),
            summary_source=str(item.get("summary_source") or ""),
            status=str(item.get("status") or "UNKNOWN"),
            message=item.get("message")
        )
    
    def _read_feedback_records(self) -> list[dict[str, Any]]:
        if not LOG_DIR.exists():
            return []

        records: list[dict[str, Any]] = []

        for path in sorted(LOG_DIR.glob("hr-copilot-feedback-*.jsonl")):
            with path.open("r", encoding="utf-8") as file:
                for line in file:
                    line = line.strip()

                    if not line:
                        continue

                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

        return records