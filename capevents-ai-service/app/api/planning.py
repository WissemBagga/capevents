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