package com.capevents.backend.dto.ai.monitoring;


import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public record AiPlanningMonitoringSummary(
        @JsonProperty("period_days")
        Integer periodDays,

        @JsonProperty("target_department_id")
        Integer targetDepartmentId,

        @JsonProperty("total_generations")
        Integer totalGenerations,

        @JsonProperty("total_usage_events")
        Integer totalUsageEvents,

        @JsonProperty("copied_count")
        Integer copiedCount,

        @JsonProperty("used_to_prefill_count")
        Integer usedToPrefillCount,

        @JsonProperty("usage_rate")
        Double usageRate,

        @JsonProperty("top_categories")
        List<Map<String, Object>> topCategories,

        @JsonProperty("top_proposals")
        List<Map<String, Object>> topProposals,

        @JsonProperty("model_versions")
        List<Map<String, Object>> modelVersions,

        @JsonProperty("latest_events")
        List<Map<String, Object>> latestEvents
) {
}