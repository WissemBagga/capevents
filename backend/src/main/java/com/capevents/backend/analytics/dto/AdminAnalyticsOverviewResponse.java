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

        long totalFeedbacks,
        double averageRating,
        double feedbackResponseRate,
        List<EventFeedbackAnalyticsResponse> topRatedEvents,
        List<EventEngagementResponse> topEngagingEvents,

        long activeMembers,
        long pendingProposals,
        List<TopMemberAnalyticsResponse> topMembers,
        List<MonthlyTrendPointResponse> monthlyTrend,
        List<DepartmentAnalyticsRowResponse> departmentRows
) {
}