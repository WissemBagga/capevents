package com.capevents.backend.dto.ai.monitoring;

import com.capevents.backend.dto.ai.copilot.AiCopilotRecentCallDto;
import com.capevents.backend.dto.ai.copilot.AiCopilotSuggestionTypeSummaryDto;
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

        @JsonProperty("feedback_count")
        Integer feedbackCount,

        @JsonProperty("useful_feedback_count")
        Integer usefulFeedbackCount,

        @JsonProperty("not_useful_feedback_count")
        Integer notUsefulFeedbackCount,

        @JsonProperty("usefulness_rate")
        Double usefulnessRate,


        @JsonProperty("top_suggestion_types")
        List<AiCopilotSuggestionTypeSummaryDto> topSuggestionTypes,

        @JsonProperty("recent_calls")
        List<AiCopilotRecentCallDto> recentCalls
) {
}