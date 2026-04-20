package com.capevents.backend.analytics.dto;

public record DepartmentAnalyticsRowResponse(
        Long departmentId,
        String departmentName,
        long totalEmployees,
        long activeEmployees,
        double participationRate,
        Double averageRating
) {
}