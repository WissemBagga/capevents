package com.capevents.backend.dto.ai;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiFeedbackInsightResponseDto(
        @JsonProperty("event_id")
        String eventId,

        @JsonProperty("event_title")
        String eventTitle,

        @JsonProperty("feedback_count")
        Integer feedbackCount,

        @JsonProperty("average_rating")
        Double averageRating,

        @JsonProperty("global_sentiment")
        String globalSentiment,

        @JsonProperty("sentiment_score")
        Double sentimentScore,

        @JsonProperty("sentiment_distribution")
        AiSentimentDistributionDto sentimentDistribution,

        List<AiFeedbackTopicDto> topics,

        List<String> keywords,

        List<String> strengths,

        List<String> improvements,

        String summary,

        @JsonProperty("qwen_used")
        Boolean qwenUsed,

        @JsonProperty("summary_source")
        String summarySource,

        @JsonProperty("model_info")
        Map<String, String> modelInfo
) {
}