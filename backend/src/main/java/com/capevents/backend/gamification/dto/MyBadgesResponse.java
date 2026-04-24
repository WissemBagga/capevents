package com.capevents.backend.gamification.dto;

import java.util.List;

public record MyBadgesResponse(
        List<BadgeProgressResponse> badges
) {
}