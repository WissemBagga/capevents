from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.schemas.planning import (
    PlanningSuggestionRequest,
    PlanningSuggestionResponse
)
from app.services.planning_service import PlanningService


from app.schemas.planning import (
    PlanningSuggestionRequest,
    PlanningSuggestionResponse,
    PlanningEventProposalRequest,
    PlanningEventProposalResponse
)

from app.services.planning_monitoring_service import get_planning_monitoring_summary
from app.schemas.planning import PlanningMonitoringSummaryResponse

router = APIRouter(
    prefix="/ai/planning",
    tags=["AI Planning Intelligent"]
)

planning_service = PlanningService()


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