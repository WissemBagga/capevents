package com.capevents.backend.dto;

import java.time.OffsetDateTime;

public record MyInvitationReminderResponse(
        Long id,
        Long invitationId,
        String subject,
        String message,
        String sentByFullName,
        String channel,
        String status,
        OffsetDateTime sentAt
) {
}