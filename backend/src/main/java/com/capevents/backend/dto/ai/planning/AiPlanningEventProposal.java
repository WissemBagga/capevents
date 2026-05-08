package com.capevents.backend.dto.ai.planning;


import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public record AiPlanningEventProposal(
        Integer rank,
        String title,
        String category,
        String audience,

        @JsonProperty("location_type")
        String locationType,

        @JsonProperty("target_department_id")
        Integer targetDepartmentId,

        @JsonProperty("duration_minutes")
        Integer durationMinutes,

        Integer capacity,
        String objective,
        List<String> rationale,

        @JsonProperty("suggested_slots")
        List<AiPlanningSlotSuggestion> suggestedSlots,

        Map<String, Object> metrics
) {
}