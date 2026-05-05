package com.capevents.backend.dto.ai;

import java.util.List;

public record AiHrCopilotResponseDto(
        List<AiHrCopilotSuggestionDto> suggestions,
        Boolean qwenUsed,
        String summarySource
) {
}