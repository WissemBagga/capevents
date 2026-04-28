package com.capevents.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record EventFeedbackResponse(
        Long id,
        UUID eventId,
        UUID userId,
        String userFullName,
        Integer rating,
        String comment,
        boolean shareCommentPublicly,
        Instant createdAt,
        Instant updatedAt
) {
}