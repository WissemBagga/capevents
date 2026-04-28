package com.capevents.backend.dto;

public record UnregisterRequest(
        String reason,
        String comment
) {
}