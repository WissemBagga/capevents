from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.schemas.planning import (
    PlanningSuggestionRequest,
    PlanningSuggestionResponse,
    PlanningEventProposalRequest,
    PlanningEventProposalResponse,
    PlanningMonitoringSummaryResponse,
    PlanningUsageLogRequest,
    PlanningUsageLogResponse
)
from app.services.planning_service import PlanningService
from app.services.planning_monitoring_service import get_planning_monitoring_summary
from app.services.prediction_logger import PredictionLogger

router = APIRouter(
    prefix="/ai/planning",
    tags=["AI Planning Intelligent"]
)

planning_service = PlanningService()
planning_logger = PredictionLogger()

@router.post("/suggestions", response_model=PlanningSuggestionResponse)
def suggest_planning_slots(
    payload: PlanningSuggestionRequest,
    _: bool = Depends(verify_ai_service_key)
):
    return planning_service.suggest_slots(payload)

@router.post("/event-proposals", response_model=PlanningEventProposalResponse)
def propose_events(
    payload: PlanningEventProposalRequest,
    _: bool = Depends(verify_ai_service_key)
):
    return planning_service.propose_events(payload)


@router.get("/monitoring/summary", response_model=PlanningMonitoringSummaryResponse)
def get_planning_monitoring_summary_endpoint(
    days: int = 30,
    target_department_id: int | None = None,
    _: bool = Depends(verify_ai_service_key)
):
    return get_planning_monitoring_summary(
        days=days,
        target_department_id=target_department_id
    )

@router.post("/usage", response_model=PlanningUsageLogResponse)
def log_planning_usage(
    payload: PlanningUsageLogRequest,
    _: bool = Depends(verify_ai_service_key)
):
    logged_at = datetime.now(timezone.utc).isoformat()

    planning_logger.log_planning(
        event_type="PROPOSAL_USAGE",
        request_id=payload.request_id,
        action=payload.action,
        proposal_rank=payload.proposal_rank,
        proposal_title=payload.proposal_title,
        category=payload.category,
        target_department_id=payload.target_department_id,
        selected_slot_start_at=payload.selected_slot_start_at,
        selected_slot_score=payload.selected_slot_score,
        created_event_id=payload.created_event_id,
        created_event_status=payload.created_event_status,
        source=payload.source
    )

    return PlanningUsageLogResponse(
        status="logged",
        logged_at=logged_at
    )