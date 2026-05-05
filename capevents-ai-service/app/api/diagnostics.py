from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.schemas.diagnostics import AiDiagnosticsResponse
from app.services.diagnostics_service import DiagnosticsService


router = APIRouter(
    prefix="/ai/diagnostics",
    tags=["AI Diagnostics"]
)

diagnostics_service = DiagnosticsService()


@router.get("/status", response_model=AiDiagnosticsResponse)
def get_ai_diagnostics_status(
    _: bool = Depends(verify_ai_service_key)
):
    return diagnostics_service.get_status()