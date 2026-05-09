package com.capevents.backend.dto.ai.monitoring;


import com.fasterxml.jackson.annotation.JsonProperty;

public record AiPlanningUsageRequest(
        @JsonProperty("request_id")
        String requestId,

        String action,

        @JsonProperty("proposal_rank")
        Integer proposalRank,

        @JsonProperty("proposal_title")
        String proposalTitle,

        String category,

        @JsonProperty("target_department_id")
        Integer targetDepartmentId,

        @JsonProperty("selected_slot_start_at")
        String selectedSlotStartAt,

        @JsonProperty("selected_slot_score")
        Double selectedSlotScore,

        String source
) {
}