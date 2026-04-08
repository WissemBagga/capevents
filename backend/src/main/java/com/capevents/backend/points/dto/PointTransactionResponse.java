package com.capevents.backend.points.dto;

import java.time.Instant;
import java.util.UUID;

public record PointTransactionResponse(
        Long id,
        String type,
        Integer pointsDelta,
        String reason,
        UUID eventId,
        String eventTitle,
        Instant createdAt
) {
}