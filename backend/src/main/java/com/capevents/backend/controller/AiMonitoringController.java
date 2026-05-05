package com.capevents.backend.controller;


import com.capevents.backend.dto.ai.AiRecommendationMonitoringSummaryDto;
import com.capevents.backend.service.ai.AiMonitoringClientService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/monitoring")
public class AiMonitoringController {

    private final AiMonitoringClientService aiMonitoringClientService;

    public AiMonitoringController(
            AiMonitoringClientService aiMonitoringClientService
    ) {
        this.aiMonitoringClientService = aiMonitoringClientService;
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/recommendations/summary")
    public AiRecommendationMonitoringSummaryDto getRecommendationMonitoringSummary(
            @RequestParam(defaultValue = "10") int maxRecent,
            @RequestParam(defaultValue = "10") int maxTopEvents
    ) {
        int safeMaxRecent = Math.max(1, Math.min(maxRecent, 50));
        int safeMaxTopEvents = Math.max(1, Math.min(maxTopEvents, 50));

        return aiMonitoringClientService.getRecommendationSummary(
                safeMaxRecent,
                safeMaxTopEvents
        );
    }
}