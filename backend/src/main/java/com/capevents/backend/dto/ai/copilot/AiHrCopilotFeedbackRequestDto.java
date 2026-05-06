package com.capevents.backend.dto.ai.copilot;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiHrCopilotFeedbackRequestDto(
        @JsonProperty("request_id")
        String requestId,

        @JsonProperty("suggestion_type")
        String suggestionType,

        @JsonProperty("related_event_id")
        String relatedEventId,

        Boolean useful,

        String comment
) {
}