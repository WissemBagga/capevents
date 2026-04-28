package com.capevents.backend.dto;

import java.util.List;

public record EmployeeInviteRequest(
        List<String> userEmails,
        String message
) {
}