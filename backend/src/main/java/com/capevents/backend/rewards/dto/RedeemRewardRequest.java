package com.capevents.backend.rewards.dto;

import jakarta.validation.constraints.NotBlank;

public record RedeemRewardRequest(
        @NotBlank
        String rewardCode
) {
}