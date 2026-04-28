package com.capevents.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelEventRequest(
        @NotBlank @Size(min = 3, max = 500) String reason
) {}
