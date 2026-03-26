package com.capevents.backend.invitation.dto;

public record SendInvitationResponse(
        int createdCount,
        int skippedCount,
        String message
) {}