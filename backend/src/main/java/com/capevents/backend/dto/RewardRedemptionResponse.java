package com.capevents.backend.dto;

import java.time.Instant;

public record RewardRedemptionResponse(
        Long id,
        String rewardCode,
        String rewardTitle,
        int pointsSpent,
        String status,
        String hrComment,
        Instant createdAt,
        Instant handledAt,
        String handledByFullName
) {
}