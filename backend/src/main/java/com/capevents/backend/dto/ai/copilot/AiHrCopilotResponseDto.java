package com.capevents.backend.dto.ai;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiHrCopilotResponseDto(
        List<AiHrCopilotSuggestionDto> suggestions,

        @JsonProperty("qwen_used")
        Boolean qwenUsed,

        @JsonProperty("summary_source")
        String summarySource
) {
}