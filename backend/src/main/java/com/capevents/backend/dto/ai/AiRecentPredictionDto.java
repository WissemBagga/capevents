package com.capevents.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiRecentPredictionDto(
        @JsonProperty("request_id")
        String requestId,

        @JsonProperty("created_at")
        String createdAt,

        @JsonProperty("user_id")
        String userId,

        String status,

        @JsonProperty("model_name")
        String modelName,

        @JsonProperty("model_version")
        String modelVersion,

        @JsonProperty("total_candidates")
        Integer totalCandidates,

        @JsonProperty("recommendations_count")
        Integer recommendationsCount
) {
}