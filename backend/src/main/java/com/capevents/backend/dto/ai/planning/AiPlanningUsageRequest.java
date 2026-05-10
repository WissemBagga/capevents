package com.capevents.backend.dto.ai.planning;


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
        Long targetDepartmentId,

        @JsonProperty("selected_slot_start_at")
        String selectedSlotStartAt,

        @JsonProperty("selected_slot_score")
        Double selectedSlotScore,

        @JsonProperty("created_event_id")
        String createdEventId,

        @JsonProperty("created_event_status")
        String createdEventStatus,

        String source
) {
}
