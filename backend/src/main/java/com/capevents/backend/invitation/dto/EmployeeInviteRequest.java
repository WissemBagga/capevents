package com.capevents.backend.invitation.dto;

import java.util.List;

public record EmployeeInviteRequest(
        List<String> userEmails,
        String message
) {
}