package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.InvitationResponseStatus;
import com.capevents.backend.entity.enums.InvitationStatus;
import com.capevents.backend.entity.enums.InvitationTargetType;

import java.time.Instant;

public record AdminEventInvitationResponse(
        String fullName,
        String email,
        String departmentName,
        InvitationTargetType targetType,
        InvitationStatus status,
        InvitationResponseStatus rsvpResponse,
        String message,
        String avatarUrl,
        Instant sentAt,
        String invitedByFullName
) {
}