package com.capevents.backend.dto.ai.recommendation;

import java.util.List;

import com.capevents.backend.dto.ai.AiRecentPredictionDto;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AiRecommendationMonitoringSummaryDto(
        @JsonProperty("total_calls")
        Integer totalCalls,

        @JsonProperty("successful_calls")
        Integer successfulCalls,

        @JsonProperty("failed_calls")
        Integer failedCalls,

        @JsonProperty("total_recommendations")
        Integer totalRecommendations,

        @JsonProperty("last_model_name")
        String lastModelName,

        @JsonProperty("last_model_version")
        String lastModelVersion,

        @JsonProperty("top_recommended_events")
        List<AiTopRecommendedEventDto> topRecommendedEvents,

        @JsonProperty("recent_predictions")
        List<AiRecentPredictionDto> recentPredictions
) {
}
