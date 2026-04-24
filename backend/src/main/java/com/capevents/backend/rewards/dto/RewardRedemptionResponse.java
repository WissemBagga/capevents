package com.capevents.backend.rewards.dto;

import java.time.Instant;

public record RewardRedemptionResponse(
        Long id,
        String rewardCode,
        String rewardTitle,
        int pointsSpent,
        String status,
        Instant createdAt
) {
}