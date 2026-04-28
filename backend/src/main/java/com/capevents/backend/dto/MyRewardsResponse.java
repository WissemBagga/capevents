package com.capevents.backend.dto;

import java.util.List;

public record MyRewardsResponse(
        long currentPoints,
        List<RewardCatalogItemResponse> catalog,
        List<RewardRedemptionResponse> history
) {
}