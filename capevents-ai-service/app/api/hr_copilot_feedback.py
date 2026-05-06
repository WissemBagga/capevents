from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.schemas.copilot_feedback import (
    HrCopilotFeedbackRequest,
    HrCopilotFeedbackResponse
)
from app.services.copilot_logger import CopilotLogger


router = APIRouter(
    prefix="/ai/hr-copilot",
    tags=["AI HR Copilot Feedback"]
)

copilot_logger = CopilotLogger()


@router.post("/feedback", response_model=HrCopilotFeedbackResponse)
def submit_hr_copilot_feedback(
    payload: HrCopilotFeedbackRequest,
    _: bool = Depends(verify_ai_service_key)
):
    copilot_logger.log_hr_copilot_feedback(
        request_id=payload.request_id,
        suggestion_type=payload.suggestion_type,
        related_event_id=payload.related_event_id,
        useful=payload.useful,
        comment=payload.comment
    )

    return HrCopilotFeedbackResponse(
        status="SAVED",
        message="Feedback Copilote RH enregistré."
    )