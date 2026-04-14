package com.capevents.backend.analytics.dto;

import java.util.UUID;

public record EventFeedbackAnalyticsResponse(
        UUID eventId,
        String title,
        String status,
        Double averageRating,
        Long feedbackCount
) {
}