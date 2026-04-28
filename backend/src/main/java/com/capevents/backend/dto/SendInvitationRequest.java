package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.InvitationTargetType;

import java.util.List;

public record SendInvitationRequest(
        InvitationTargetType targetType,
        Long departmentId,
        List<String> userEmails,
        String message
) {}