from pydantic import BaseModel


class TopRecommendedEvent(BaseModel):
    event_id: str
    title: str | None = None
    category: str | None = None
    count: int


class RecentPrediction(BaseModel):
    request_id: str
    created_at: str
    user_id: str
    status: str
    model_name: str
    model_version: str
    total_candidates: int
    recommendations_count: int


class RecommendationMonitoringSummary(BaseModel):
    total_calls: int
    successful_calls: int
    failed_calls: int
    total_recommendations: int
    last_model_name: str | None = None
    last_model_version: str | None = None
    top_recommended_events: list[TopRecommendedEvent]
    recent_predictions: list[RecentPrediction]