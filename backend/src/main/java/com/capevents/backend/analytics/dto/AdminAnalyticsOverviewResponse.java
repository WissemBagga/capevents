package com.capevents.backend.analytics.dto;

import java.util.List;

public record AdminAnalyticsOverviewResponse(
        long totalEvents,
        long publishedEvents,
        long totalRegistrations,
        long totalCapacity,
        double registrationRate,
        long totalPresent,
        long totalAbsent,
        double attendanceRate,
        List<EventEngagementResponse> topEngagingEvents
) {
}