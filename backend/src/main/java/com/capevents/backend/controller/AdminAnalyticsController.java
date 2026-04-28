package com.capevents.backend.controller;

import com.capevents.backend.service.AdminAnalyticsService;
import com.capevents.backend.dto.AdminAnalyticsOverviewResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    public AdminAnalyticsController(AdminAnalyticsService adminAnalyticsService) {
        this.adminAnalyticsService = adminAnalyticsService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/overview")
    public AdminAnalyticsOverviewResponse getOverview(
            Authentication auth,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String category
    ) {
        return adminAnalyticsService.getOverview(
                auth.getName(),
                from,
                to,
                departmentId,
                category
        );
    }
}