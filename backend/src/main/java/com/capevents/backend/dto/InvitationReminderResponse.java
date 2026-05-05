package com.capevents.backend.dto;

import java.util.UUID;

public record InvitationReminderResponse(
        UUID eventId,
        String eventTitle,
        int eligibleInvitations,
        int remindersSent,
        int remindersFailed,
        String message
) {
}