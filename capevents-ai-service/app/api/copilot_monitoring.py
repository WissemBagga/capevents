from fastapi import APIRouter, Depends, Query

from app.core.security import verify_ai_service_key
from app.schemas.copilot_monitoring import HrCopilotMonitoringResponse
from app.services.copilot_monitoring_service import CopilotMonitoringService


router = APIRouter(
    prefix="/ai/monitoring/hr-copilot",
    tags=["AI HR Copilot Monitoring"]
)

copilot_monitoring_service = CopilotMonitoringService()


@router.get("/summary", response_model=HrCopilotMonitoringResponse)
def get_hr_copilot_monitoring_summary(
    limit: int = Query(default=10, ge=1, le=50),
    _: bool = Depends(verify_ai_service_key)
):
    return copilot_monitoring_service.get_hr_copilot_summary(limit=limit)