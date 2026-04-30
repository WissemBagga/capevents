from fastapi import APIRouter, Depends

from app.core.security import verify_ai_service_key
from app.data.db import test_database_connection

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check(_: bool = Depends(verify_ai_service_key)):
    database_ok = test_database_connection()

    return {
        "service": "CapEvents AI Service",
        "status": "UP" if database_ok else "DEGRADED",
        "database": "CONNECTED" if database_ok else "DISCONNECTED"
    }