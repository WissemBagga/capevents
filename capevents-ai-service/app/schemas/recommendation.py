from typing import Optional

from pydantic import BaseModel


class RecommendationItem(BaseModel):
    event_id: str
    title: Optional[str] = None
    category: Optional[str] = None
    start_at: Optional[str] = None
    rank: int
    score: float
    reasons: list[str]


class RecommendationResponse(BaseModel):
    user_id: str
    total_candidates: int
    items: list[RecommendationItem]
    message: Optional[str] = None