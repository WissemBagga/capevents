package com.capevents.backend.dto.ai;

import java.util.Map;

public record AiHrCopilotSuggestionDto(
        String type,
        String priority,
        String title,
        String insight,
        String recommendedAction,
        String draft,
        String relatedEventId,
        String relatedEventTitle,
        Map<String, Object> metadata
) {
}