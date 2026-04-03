package com.capevents.backend.invitation.dto;

import java.util.List;

public record SendInvitationResponse(
        int createdCount,
        int skippedCount,
        String message,
        List<InvitationCreatedItemResponse> invitedItems,
        List<InvitationSkippedItemResponse> skippedItems
) {
}