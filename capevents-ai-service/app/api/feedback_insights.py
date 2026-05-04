from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.schemas.feedback_insights import FeedbackInsightResponse
from app.services.feedback_insights_service import FeedbackInsightsService


router = APIRouter(
    prefix="/ai/feedback",
    tags=["AI Feedback Intelligence"]
)

feedback_insights_service = FeedbackInsightsService()


@router.get(
    "/events/{event_id}/insights",
    response_model=FeedbackInsightResponse
)
def get_event_feedback_insights(
    event_id: str,
    _: bool = Depends(verify_ai_service_key)
):
    return feedback_insights_service.get_event_feedback_insights(event_id)