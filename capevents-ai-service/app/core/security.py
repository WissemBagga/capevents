import secrets

from fastapi import Header, HTTPException, status

from app.core.config import settings


AI_SERVICE_KEY_HEADER = "x-ai-service-key"


def verify_ai_service_key(
    x_ai_service_key: str | None = Header(default=None, alias=AI_SERVICE_KEY_HEADER),
) -> bool:
    """
    Validate the internal service key used by Spring Boot to call the AI service.

    The key must never be exposed to Angular or any public frontend.
    """
    if not x_ai_service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing AI service key",
        )

    if not secrets.compare_digest(x_ai_service_key, settings.ai_service_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid AI service key",
        )

    return True