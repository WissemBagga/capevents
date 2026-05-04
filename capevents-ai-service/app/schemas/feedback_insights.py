from pydantic import BaseModel


class SentimentDistribution(BaseModel):
    positive: int
    neutral: int
    negative: int


class FeedbackTopic(BaseModel):
    topic_id: int
    label: str
    count: int
    keywords: list[str]


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