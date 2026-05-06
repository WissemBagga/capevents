package com.capevents.backend.dto.ai.copilot;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiHrCopilotSuggestionDto(
        String type,
        String priority,
        String title,
        String insight,

        @JsonProperty("recommended_action")
        String recommendedAction,

        @JsonProperty("action_type")
        String actionType,

        String draft,

        @JsonProperty("related_event_id")
        String relatedEventId,

        @JsonProperty("related_event_title")
        String relatedEventTitle,

        Map<String, Object> metadata
) {
}