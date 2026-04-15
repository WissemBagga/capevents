package com.capevents.backend.invitation.dto;

import com.capevents.backend.invitation.InvitationResponseStatus;
import com.capevents.backend.invitation.InvitationStatus;
import com.capevents.backend.invitation.InvitationTargetType;

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