package com.capevents.backend.controller;

import com.capevents.backend.dto.ai.AiHrCopilotResponseDto;
import com.capevents.backend.service.ai.AiHrCopilotClientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/hr-copilot")
public class AiHrCopilotController {

    private final AiHrCopilotClientService aiHrCopilotClientService;

    public AiHrCopilotController(AiHrCopilotClientService aiHrCopilotClientService) {
        this.aiHrCopilotClientService = aiHrCopilotClientService;
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/suggestions")
    public AiHrCopilotResponseDto getSuggestions() {
        return aiHrCopilotClientService.getSuggestions();
    }
}