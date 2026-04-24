package com.capevents.backend.rewards.dto;

import java.time.Instant;

public record RewardAdminRequestResponse(
        Long id,
        String employeeFullName,
        String employeeEmail,
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