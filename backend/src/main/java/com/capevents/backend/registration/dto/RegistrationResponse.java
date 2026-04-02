package com.capevents.backend.registration.dto;

import com.capevents.backend.registration.RegistrationStatus;

import java.time.Instant;
import java.util.UUID;

public record RegistrationResponse(
        Long id,
        UUID eventId,
        String eventTitle,
        Instant eventStartAt,
        RegistrationStatus status,
        Instant registeredAt,
        Instant cancelledAt
) {}