package com.capevents.backend.dto.ai;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiRecommendationItemDto(
        @JsonProperty("event_id")
        String eventId,

        String title,

        String category,

        @JsonProperty("start_at")
        String startAt,

        Integer rank,

        Double score,

        List<String> reasons
) {
}