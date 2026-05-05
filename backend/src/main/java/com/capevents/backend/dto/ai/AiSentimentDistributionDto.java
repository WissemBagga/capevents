package com.capevents.backend.dto.ai;

public record AiSentimentDistributionDto(
        Integer positive,
        Integer neutral,
        Integer negative
) {
}
