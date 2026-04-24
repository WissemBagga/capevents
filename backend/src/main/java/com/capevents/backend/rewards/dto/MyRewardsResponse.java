package com.capevents.backend.rewards.dto;

import java.util.List;

public record MyRewardsResponse(
        long currentPoints,
        List<RewardCatalogItemResponse> catalog,
        List<RewardRedemptionResponse> history
) {
}