package com.capevents.backend.notification.dto;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String actionPath,
        boolean read,
        Instant createdAt,
        Instant readAt
) {
}