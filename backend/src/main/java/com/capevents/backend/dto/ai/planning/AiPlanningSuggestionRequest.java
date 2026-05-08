package com.capevents.backend.dto.ai.planning;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiPlanningSuggestionRequest(
        String category,
        String audience,

        @JsonProperty("location_type")
        String locationType,

        @JsonProperty("target_department_id")
        Integer targetDepartmentId,

        @JsonProperty("duration_minutes")
        Integer durationMinutes,

        Integer capacity,

        @JsonProperty("from_date")
        String fromDate,

        @JsonProperty("days_horizon")
        Integer daysHorizon,

        Integer limit
) {
}