package com.capevents.backend.department.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(
        @NotBlank
        @Size(max = 120)
        String name
) {}