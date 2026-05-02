package com.capevents.backend.dto.ai;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiRecommendationResponseDto(
        @JsonProperty("user_id")
        String userId,

        @JsonProperty("total_candidates")
        Integer totalCandidates,

        List<AiRecommendationItemDto> items,

        String message
) {
}