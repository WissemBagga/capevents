package com.capevents.backend.invitation.dto;

import com.capevents.backend.invitation.InvitationTargetType;

import java.util.List;

public record SendInvitationRequest(
        InvitationTargetType targetType,
        Long departmentId,
        List<String> userEmails,
        String message
) {}