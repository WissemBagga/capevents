from pydantic import BaseModel, Field


class HrCopilotFeedbackRequest(BaseModel):
    request_id: str = Field(min_length=1)
    suggestion_type: str = Field(min_length=1)
    related_event_id: str | None = None
    useful: bool
    comment: str | None = None


class HrCopilotFeedbackResponse(BaseModel):
    status: str
    message: str