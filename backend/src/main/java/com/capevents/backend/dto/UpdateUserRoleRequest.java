package com.capevents.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserRoleRequest(
        @NotBlank
        String roleCode,
        Boolean confirmHrPromotion
) {}