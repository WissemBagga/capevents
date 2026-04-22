package com.capevents.backend.feedback.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PastEventFeedbackDetailsResponse(
        UUID eventId,
        String title,
        String category,
        String imageUrl,
        String departmentName,
        String audience,
        Instant startAt,
        double averageRating,
        long feedbackCount,
        double feedbackResponseRate,
        long presentCount,
        List<String> highlights,
        List<String> improvementPoints,
        List<PublicFeedbackItemResponse> publicComments
) {}