package com.capevents.backend.dto;

public record InvitationSkippedItemResponse(
        String fullName,
        String email,
        String reason
) {
}