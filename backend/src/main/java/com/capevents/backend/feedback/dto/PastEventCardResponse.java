package com.capevents.backend.feedback.dto;

import java.time.Instant;
import java.util.UUID;

public record PastEventCardResponse(
        UUID eventId,
        String title,
        String category,
        String imageUrl,
        String departmentName,
        String audience,
        Instant startAt,
        double averageRating,
        long feedbackCount,
        long presentCount,
        String teaser
) {}