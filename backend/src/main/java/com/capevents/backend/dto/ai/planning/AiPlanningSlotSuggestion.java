package com.capevents.backend.dto.ai.planning;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public record AiPlanningSlotSuggestion(
        Integer rank,

        @JsonProperty("start_at")
        String startAt,

        @JsonProperty("end_at")
        String endAt,

        @JsonProperty("day_of_week")
        Integer dayOfWeek,

        Integer hour,
        Double score,
        String confidence,
        List<String> reasons,
        Map<String, Object> metrics
) {
}