package com.capevents.backend.dto.ai.copilot;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiCopilotRecentCallDto(
        @JsonProperty("request_id")
        String requestId,

        @JsonProperty("created_at")
        String createdAt,

        @JsonProperty("suggestions_count")
        Integer suggestionsCount,

        @JsonProperty("suggestion_types")
        List<String> suggestionTypes,

        @JsonProperty("related_event_ids")
        List<String> relatedEventIds,

        @JsonProperty("qwen_used")
        Boolean qwenUsed,

        @JsonProperty("summary_source")
        String summarySource,

        String status,
        String message
) {
}