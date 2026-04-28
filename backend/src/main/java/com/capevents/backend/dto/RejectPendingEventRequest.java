package com.capevents.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectPendingEventRequest(
        @NotBlank
        @Size(min = 3, max = 1000)
        String reason
) {
}