package com.capevents.backend.dto;

import java.time.Instant;

public record BadgeProgressResponse(
        String code,
        String title,
        String description,
        boolean unlocked,
        Instant unlockedAt,
        int progress,
        int target
) {
}