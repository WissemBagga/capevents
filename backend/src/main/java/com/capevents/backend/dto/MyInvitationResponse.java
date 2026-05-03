package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.InvitationResponseStatus;
import com.capevents.backend.entity.enums.InvitationStatus;
import com.capevents.backend.entity.enums.InvitationTargetType;

import java.time.Instant;
import java.util.UUID;

public record MyInvitationResponse(
        Long invitationId,
        UUID eventId,
        String eventTitle,
        Instant eventStartAt,
        InvitationTargetType targetType,
        InvitationStatus status,
        InvitationResponseStatus rsvpResponse,
        String message,
        Instant sentAt,
        String invitedByFullName,
        String invitationSource,
        String avatarUrl
) {

}