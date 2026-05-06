package com.capevents.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiHrCopilotMonitoringResponseDto(
        @JsonProperty("total_calls")
        Integer totalCalls,

        @JsonProperty("successful_calls")
        Integer successfulCalls,

        @JsonProperty("failed_calls")
        Integer failedCalls,

        @JsonProperty("total_suggestions")
        Integer totalSuggestions,

        @JsonProperty("qwen_used_count")
        Integer qwenUsedCount,

        @JsonProperty("qwen_usage_rate")
        Double qwenUsageRate,

        @JsonProperty("top_suggestion_types")
        List<AiCopilotSuggestionTypeSummaryDto> topSuggestionTypes,

        @JsonProperty("recent_calls")
        List<AiCopilotRecentCallDto> recentCalls
) {
}