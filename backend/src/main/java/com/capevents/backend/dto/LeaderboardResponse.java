package com.capevents.backend.dto;

import java.util.List;

public record LeaderboardResponse(
        List<LeaderboardParticipantResponse> topParticipants,
        LeaderboardParticipantResponse currentUserRank,
        long totalParticipants
) {}
