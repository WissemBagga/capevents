package com.capevents.backend.controller;

import com.capevents.backend.dto.MyPointsResponse;
import com.capevents.backend.service.PointService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/points")
public class MyPointsController {

    private final PointService pointService;

    public MyPointsController(PointService pointService) {
        this.pointService = pointService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public MyPointsResponse getMyPoints(
            @RequestParam(defaultValue = "20") int limit,
            Authentication auth
    ) {
        return pointService.getMyPoints(auth.getName(), limit);
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/leaderboard")
    public com.capevents.backend.dto.LeaderboardResponse getLeaderboard(Authentication auth) {
        return pointService.getLeaderboard(auth.getName());
    }
}