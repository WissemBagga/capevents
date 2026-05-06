package com.capevents.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiTopRecommendedEventDto(
        @JsonProperty("event_id")
        String eventId,

        String title,

        String category,

        Integer count
) {
}