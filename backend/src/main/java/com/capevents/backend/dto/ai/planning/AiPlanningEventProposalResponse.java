package com.capevents.backend.dto.ai.planning;


import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public record AiPlanningEventProposalResponse(
        @JsonProperty("request_id")
        String requestId,

        @JsonProperty("generated_at")
        String generatedAt,

        @JsonProperty("analysis_period")
        Map<String, Object> analysisPeriod,

        @JsonProperty("total_proposals")
        Integer totalProposals,

        List<AiPlanningEventProposal> items,

        @JsonProperty("model_info")
        Map<String, Object> modelInfo
) {
}