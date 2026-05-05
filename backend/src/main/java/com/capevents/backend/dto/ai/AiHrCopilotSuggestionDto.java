package com.capevents.backend.dto.ai;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiHrCopilotSuggestionDto(
        String type,
        String priority,
        String title,
        String insight,

        @JsonProperty("recommended_action")
        String recommendedAction,

        String draft,

        @JsonProperty("related_event_id")
        String relatedEventId,

        @JsonProperty("related_event_title")
        String relatedEventTitle,

        Map<String, Object> metadata
) {
}