package com.capevents.backend.dto;

import java.util.List;

public record MyPointsResponse(
        long totalPoints,
        List<PointTransactionResponse> history
) {
}