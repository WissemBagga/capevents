from fastapi import APIRouter, Depends, Query

from app.core.security import verify_ai_service_key
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import RecommendationService


router = APIRouter(
    prefix="/ai/recommendations",
    tags=["Recommendations"],
)

recommendation_service = RecommendationService()


@router.get(
    "/users/{user_id}",
    response_model=RecommendationResponse,
    summary="Recommend events for an employee",
    description=(
        "Returns personalized event recommendations for a given employee. "
        "The ranking is produced by the active CatBoost recommendation model."
    ),
)
def recommend_for_user(
    user_id: str,
    limit: int = Query(default=5, ge=1, le=20),
    _: bool = Depends(verify_ai_service_key),
):
    return recommendation_service.recommend_for_user(
        user_id=user_id,
        limit=limit,
    )