package com.capevents.backend.event.dto;

import com.capevents.backend.event.EventAudience;
import com.capevents.backend.event.EventLocationType;
import com.capevents.backend.event.EventStatus;

import java.time.Instant;
import java.util.UUID;

public record EventResponse (
        UUID id,
        String title,
        String category,
        String description,
        Instant startAt,
        Integer durationMinutes,
        EventLocationType locationType,
        String locationName,
        String meetingUrl,
        String address,
        Integer capacity,
        Instant registrationDeadline,
        EventStatus status,

        String createdByEmail,
        String createdByFullName,

        EventAudience audience,
        Long targetDepartmentId,
        String targetDepartmentName,

        String cancelReason,

        Instant createdAt,
        Instant updatedAt,
        String imageUrl,

        Long registeredCount,
        Long remainingCapacity
) {}

