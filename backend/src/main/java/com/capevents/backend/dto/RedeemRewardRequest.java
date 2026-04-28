package com.capevents.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record RedeemRewardRequest(
        @NotBlank
        String rewardCode
) {
}