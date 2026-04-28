package com.capevents.backend.dto;

import java.util.List;

public record MyBadgesResponse(
        List<BadgeProgressResponse> badges
) {
}