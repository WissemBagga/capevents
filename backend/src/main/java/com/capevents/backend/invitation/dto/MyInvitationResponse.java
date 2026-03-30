package com.capevents.backend.invitation.dto;

import com.capevents.backend.invitation.InvitationStatus;
import com.capevents.backend.invitation.InvitationTargetType;

import java.time.Instant;
import java.util.UUID;

public record MyInvitationResponse(
        UUID eventId,
        String eventTitle,
        Instant eventStartAt,
        InvitationTargetType targetType,
        InvitationStatus status,
        String message,
        Instant sentAt
) {

}