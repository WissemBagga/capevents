from pydantic import BaseModel, Field


class RecommendationItem(BaseModel):
    event_id: str = Field(description="Recommended event identifier.")
    title: str | None = Field(default=None, description="Recommended event title.")
    category: str | None = Field(default=None, description="Event category.")
    start_at: str | None = Field(default=None, description="Event start date as ISO string.")
    rank: int = Field(description="Recommendation rank.")
    score: float = Field(description="Model prediction score.")
    reasons: list[str] = Field(description="Human-readable explanation reasons.")


class RecommendationResponse(BaseModel):
    user_id: str = Field(description="Employee identifier.")
    total_candidates: int = Field(description="Number of candidate events scored by the model.")
    items: list[RecommendationItem] = Field(description="Ranked recommendation items.")
    message: str | None = Field(default=None, description="Response message.")
    request_id: str | None = Field(default=None, description="Prediction request identifier.")
    model_version: str | None = Field(default=None, description="Active recommendation model version.")