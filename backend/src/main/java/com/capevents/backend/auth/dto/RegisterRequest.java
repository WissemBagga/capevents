package com.capevents.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max=80) String firstName,
        @NotBlank @Size(max=80) String lastName,
        @NotBlank @Email @Size(max = 190) String email,
        @NotBlank @Size(min = 8, max= 72) String password,
        @Size(max = 20) String phone,
        Long departmentId,
        @Size(max = 500) String avatarUrl

) {}

