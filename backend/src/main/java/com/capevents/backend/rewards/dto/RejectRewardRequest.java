package com.capevents.backend.rewards.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectRewardRequest(
        @NotBlank
        @Size(max = 1000)
        String reason
) {
}