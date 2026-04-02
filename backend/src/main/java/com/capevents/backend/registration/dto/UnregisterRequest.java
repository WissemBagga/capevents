package com.capevents.backend.registration.dto;

public record UnregisterRequest(
        String reason,
        String comment
) {
}