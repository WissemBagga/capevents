package com.capevents.backend.dto;

import java.time.OffsetDateTime;

public record InvitationReminderHistoryResponse(
        Long id,
        Long invitationId,

        String recipientFullName,
        String recipientEmail,

        String sentByFullName,
        String sentByEmail,

        String channel,
        String subject,
        String message,
        String status,
        String errorMessage,
        OffsetDateTime sentAt
) {
}