package com.capevents.backend.event.dto;

import com.capevents.backend.event.EventStatus;

import java.util.UUID;

public record EmployeeEventSubmissionResponse(
        UUID eventId,
        EventStatus status,
        boolean directlyPublished,
        String message
) {
}