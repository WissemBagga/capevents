package com.capevents.backend.analytics.dto;

public record DepartmentTopParticipantResponse(
        Long departmentId,
        String departmentName,
        String fullName,
        String email,
        long registeredCount,
        long presentCount,
        double attendanceRate
) {
}