package com.capevents.backend.controller;

import com.capevents.backend.dto.ai.AiDiagnosticsResponseDto;
import com.capevents.backend.service.ai.AiDiagnosticsClientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/diagnostics")
public class AiDiagnosticsController {

    private final AiDiagnosticsClientService aiDiagnosticsClientService;

    public AiDiagnosticsController(AiDiagnosticsClientService aiDiagnosticsClientService) {
        this.aiDiagnosticsClientService = aiDiagnosticsClientService;
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/status")
    public AiDiagnosticsResponseDto getStatus() {
        return aiDiagnosticsClientService.getStatus();
    }
}