package com.capevents.backend.dto.ai.planning;


import com.fasterxml.jackson.annotation.JsonProperty;

public record AiPlanningEventProposalRequest(
        @JsonProperty("reference_date")
        String referenceDate,

        @JsonProperty("target_department_id")
        Long targetDepartmentId,

        Integer limit,

        @JsonProperty("slot_limit")
        Integer slotLimit,

        @JsonProperty("days_horizon")
        Integer daysHorizon
) {
}