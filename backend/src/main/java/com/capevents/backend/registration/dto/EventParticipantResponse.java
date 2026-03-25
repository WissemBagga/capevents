package com.capevents.backend.registration.dto;

import java. time. Instant;
import java.util.UUID;

public record EventParticipantResponse(
        Long registrationId,
        UUID userId,
        String firstName,
        String lastName,
        String email,
        String departmentName,
        Instant registeredAt
) {}