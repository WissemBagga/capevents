from typing import Any

from pydantic import BaseModel, field_validator

from app.core.text_sanitizer import clean_text, sanitize_payload


class SentimentDistribution(BaseModel):
    positive: int
    neutral: int
    negative: int


class FeedbackTopic(BaseModel):
    topic_id: int
    label: str
    count: int
    keywords: list[str]

    @field_validator("label", mode="before")
    @classmethod
    def clean_label(cls, value: Any) -> Any:
        return clean_text(value)

    @field_validator("keywords", mode="before")
    @classmethod
    def clean_keywords(cls, value: Any) -> Any:
        return sanitize_payload(value or [])


class FeedbackInsightResponse(BaseModel):
    event_id: str
    event_title: str | None = None
    feedback_count: int
    average_rating: float
    global_sentiment: str
    sentiment_score: float
    sentiment_distribution: SentimentDistribution
    topics: list[FeedbackTopic]
    keywords: list[str]
    strengths: list[str]
    improvements: list[str]
    summary: str
    qwen_used: bool
    summary_source: str
    model_info: dict[str, str]

    @field_validator(
        "event_title",
        "summary",
        mode="before",
    )
    @classmethod
    def clean_text_fields(cls, value: Any) -> Any:
        if value is None:
            return None

        return clean_text(value)

    @field_validator(
        "keywords",
        "strengths",
        "improvements",
        mode="before",
    )
    @classmethod
    def clean_text_lists(cls, value: Any) -> Any:
        return sanitize_payload(value or [])

    @field_validator("model_info", mode="before")
    @classmethod
    def clean_model_info(cls, value: Any) -> Any:
        return sanitize_payload(value or {})