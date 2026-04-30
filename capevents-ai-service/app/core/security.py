from fastapi import Header, HTTPException, status

from app.core.config import settings


def verify_ai_service_key(x_ai_service_key: str | None = Header(default=None)):
    if not x_ai_service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing AI service key"
        )

    if x_ai_service_key != settings.ai_service_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid AI service key"
        )

    return True