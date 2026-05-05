from pydantic import BaseModel


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


class HrCopilotResponse(BaseModel):
    suggestions: list[HrCopilotSuggestion]
    qwen_used: bool
    summary_source: str

