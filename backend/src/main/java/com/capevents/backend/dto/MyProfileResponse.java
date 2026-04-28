package com.capevents.backend.dto;

import java.util.Set;
import java.util.UUID;

public record MyProfileResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String jobTitle,
        Long departmentId,
        String departmentName,
        String avatarUrl,
        Set<String> roles
) {}