package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.EventStatus;

import java.util.UUID;

public record EmployeeEventSubmissionResponse(
        UUID eventId,
        EventStatus status,
        boolean directlyPublished,
        String message
) {
}