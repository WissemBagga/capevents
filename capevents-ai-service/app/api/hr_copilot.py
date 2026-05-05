from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.schemas.hr_copilot import HrCopilotResponse
from app.services.hr_copilot_service import HrCopilotService


router = APIRouter(
    prefix="/ai/hr-copilot",
    tags=["AI HR Copilot"]
)

hr_copilot_service = HrCopilotService()


@router.get("/suggestions", response_model=HrCopilotResponse)
def get_hr_copilot_suggestions(
    _: bool = Depends(verify_ai_service_key)
):
    return hr_copilot_service.get_suggestions()