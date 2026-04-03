package com.capevents.backend.invitation.dto;

public record InvitationSkippedItemResponse(
        String fullName,
        String email,
        String reason
) {
}