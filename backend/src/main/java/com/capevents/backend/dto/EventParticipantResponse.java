package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.AttendanceStatus;

import java. time. Instant;
import java.util.UUID;

public record EventParticipantResponse(
        Long registrationId,
        UUID userId,
        String firstName,
        String lastName,
        String email,
        String departmentName,
        String avatarUrl,
        Instant registeredAt,
        AttendanceStatus attendanceStatus
) {}