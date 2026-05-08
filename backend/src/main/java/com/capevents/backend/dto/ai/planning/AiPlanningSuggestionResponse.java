package com.capevents.backend.dto.ai.planning;


import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public record AiPlanningSuggestionResponse(
        @JsonProperty("request_id")
        String requestId,

        @JsonProperty("generated_at")
        String generatedAt,

        @JsonProperty("total_candidates")
        Integer totalCandidates,

        List<AiPlanningSlotSuggestion> items,

        @JsonProperty("model_info")
        Map<String, Object> modelInfo
) {
}