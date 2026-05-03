package com.capevents.backend.dto;

import java.util.UUID;

public record LeaderboardParticipantResponse(
        UUID userId,
        int rank,
        String firstName,
        String lastName,
        String displayName,
        String avatarUrl,
        long points,
        boolean isCurrentUser
) {}
