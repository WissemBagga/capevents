package com.capevents.backend.dto;

import java.util.UUID;

public record EmployeeInvitableUserResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        Long departmentId,
        String departmentName,
        String avatarUrl
) {
}