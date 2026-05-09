from pydantic import BaseModel, Field


class PlanningSuggestionRequest(BaseModel):
    category: str = Field(min_length=1)
    audience: str = "GLOBAL"
    location_type: str = "ONSITE"
    target_department_id: int | None = None
    duration_minutes: int = Field(default=60, ge=15, le=480)
    capacity: int = Field(default=30, ge=1)
    from_date: str | None = None
    days_horizon: int = Field(default=30, ge=1, le=120)
    limit: int = Field(default=5, ge=1, le=20)


class PlanningSlotSuggestion(BaseModel):
    rank: int
    start_at: str
    end_at: str
    day_of_week: int
    hour: int
    score: float
    confidence: str
    reasons: list[str]
    metrics: dict


class PlanningSuggestionResponse(BaseModel):
    request_id: str
    generated_at: str
    total_candidates: int
    items: list[PlanningSlotSuggestion]
    model_info: dict

class PlanningEventProposalRequest(BaseModel):
    reference_date: str | None = None
    target_department_id: int | None = None
    limit: int = Field(default=3, ge=1, le=10)
    slot_limit: int = Field(default=3, ge=1, le=5)
    days_horizon: int = Field(default=30, ge=7, le=120)


class PlanningEventProposal(BaseModel):
    rank: int
    title: str
    category: str
    audience: str
    location_type: str
    target_department_id: int | None = None
    duration_minutes: int
    capacity: int
    objective: str
    rationale: list[str]
    suggested_slots: list[PlanningSlotSuggestion]
    metrics: dict


class PlanningEventProposalResponse(BaseModel):
    request_id: str
    generated_at: str
    analysis_period: dict
    total_proposals: int
    items: list[PlanningEventProposal]
    model_info: dict


class PlanningUsageLogRequest(BaseModel):
    request_id: str | None = None
    action: str = "USED_TO_PREFILL"
    proposal_rank: int | None = None
    proposal_title: str | None = None
    category: str | None = None
    target_department_id: int | None = None
    selected_slot_start_at: str | None = None
    selected_slot_score: float | None = None
    source: str = "angular_admin_dashboard"


class PlanningUsageLogResponse(BaseModel):
    status: str
    logged_at: str