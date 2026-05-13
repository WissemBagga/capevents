from typing import Any

from pydantic import BaseModel, field_validator

from app.core.text_sanitizer import clean_text, sanitize_payload


class HrCopilotSuggestion(BaseModel):
    type: str
    priority: str
    title: str
    insight: str
    recommended_action: str
    action_type: str | None = None
    draft: str | None = None
    related_event_id: str | None = None
    related_event_title: str | None = None
    metadata: dict

    @field_validator(
        "title",
        "insight",
        "recommended_action",
        "draft",
        "related_event_title",
        mode="before",
    )
    @classmethod
    def clean_text_fields(cls, value: Any) -> Any:
        if value is None:
            return None

        return clean_text(value)

    @field_validator("metadata", mode="before")
    @classmethod
    def clean_metadata(cls, value: Any) -> Any:
        return sanitize_payload(value or {})


class HrCopilotResponse(BaseModel):
    request_id: str
    generated_at: str
    suggestions: list[HrCopilotSuggestion]
    qwen_used: bool
    summary_source: str