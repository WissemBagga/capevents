package com.capevents.backend.rewards.dto;

public record RewardCatalogItemResponse(
        String code,
        String title,
        String description,
        int pointsCost,
        boolean requiresHrAction,
        boolean affordable
) {
}