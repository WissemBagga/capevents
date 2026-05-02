from fastapi import APIRouter, Depends, Query

from app.core.security import verify_ai_service_key
from app.schemas.monitoring import RecommendationMonitoringSummary
from app.services.monitoring_service import MonitoringService


router = APIRouter(
    prefix="/ai/monitoring",
    tags=["AI Monitoring"]
)

monitoring_service = MonitoringService()


@router.get(
    "/recommendations/summary",
    response_model=RecommendationMonitoringSummary
)
def get_recommendation_monitoring_summary(
    max_recent: int = Query(default=10, ge=1, le=50),
    max_top_events: int = Query(default=10, ge=1, le=50),
    _: bool = Depends(verify_ai_service_key)
):
    return monitoring_service.get_recommendation_summary(
        max_recent=max_recent,
        max_top_events=max_top_events
    )