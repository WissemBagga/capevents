package com.capevents.backend.analytics.dto;

public record TopMemberAnalyticsResponse(
        String fullName,
        String email,
        String departmentName,
        long registeredCount,
        long presentCount,
        double attendanceRate
) {
}