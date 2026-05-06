from pydantic import BaseModel


class CopilotSuggestionTypeSummary(BaseModel):
    type: str
    count: int


class CopilotRecentCall(BaseModel):
    request_id: str
    created_at: str
    suggestions_count: int
    suggestion_types: list[str]
    related_event_ids: list[str]
    qwen_used: bool
    summary_source: str
    status: str
    message: str | None = None


class HrCopilotMonitoringResponse(BaseModel):
    total_calls: int
    successful_calls: int
    failed_calls: int

    total_suggestions: int
    qwen_used_count: int
    qwen_usage_rate: float

    feedback_count: int
    useful_feedback_count: int
    not_useful_feedback_count: int
    usefulness_rate: float

    top_suggestion_types: list[CopilotSuggestionTypeSummary]
    recent_calls: list[CopilotRecentCall]