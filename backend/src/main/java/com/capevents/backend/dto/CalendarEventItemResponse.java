package com.capevents.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record CalendarEventItemResponse(
        UUID eventId,
        String title,
        String category,
        String status,
        String audience,
        String departmentName,
        Instant startAt,
        Integer durationMinutes,
        boolean registered,
        boolean adminView
) {
}