package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.EventStatus;
import com.capevents.backend.entity.enums.RegistrationStatus;

import java.time.Instant;
import java.util.UUID;

public record RegistrationResponse(
        Long registrationId,
        UUID eventId,
        String eventTitle,
        Instant eventStartAt,

        RegistrationStatus status,
        Instant registeredAt,
        Instant cancelledAt,

        EventStatus eventStatus,
        String eventCancelReason
) {
}