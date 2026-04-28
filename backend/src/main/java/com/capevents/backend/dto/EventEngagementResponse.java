package com.capevents.backend.dto;

import java.util.UUID;

public record EventEngagementResponse(
        UUID eventId,
        String title,
        String status,
        Long registeredCount,
        Long capacity,
        Long presentCount,
        Long absentCount,
        Double attendanceRate
) {
}