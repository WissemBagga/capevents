package com.capevents.backend.controller.ai;

import com.capevents.backend.dto.ai.monitoring.AiHrCopilotMonitoringResponseDto;
import com.capevents.backend.service.ai.AiHrCopilotMonitoringClientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/monitoring/hr-copilot")
public class AiHrCopilotMonitoringController {

    private final AiHrCopilotMonitoringClientService monitoringClientService;

    public AiHrCopilotMonitoringController(
            AiHrCopilotMonitoringClientService monitoringClientService
    ) {
        this.monitoringClientService = monitoringClientService;
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/summary")
    public AiHrCopilotMonitoringResponseDto getSummary(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return monitoringClientService.getSummary(limit);
    }
}