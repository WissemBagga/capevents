package com.capevents.backend.points.dto;

import java.util.List;

public record MyPointsResponse(
        long totalPoints,
        List<PointTransactionResponse> history
) {
}