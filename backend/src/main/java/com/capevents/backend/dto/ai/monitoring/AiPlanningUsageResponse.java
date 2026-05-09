package com.capevents.backend.dto.ai.monitoring;


import com.fasterxml.jackson.annotation.JsonProperty;

public record AiPlanningUsageResponse(
        String status,

        @JsonProperty("logged_at")
        String loggedAt
) {
}