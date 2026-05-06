package com.capevents.backend.controller;

import com.capevents.backend.dto.ai.AiHrCopilotFeedbackRequestDto;
import com.capevents.backend.dto.ai.AiHrCopilotFeedbackResponseDto;
import com.capevents.backend.service.ai.AiHrCopilotFeedbackClientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/hr-copilot/feedback")
public class AiHrCopilotFeedbackController {

    private final AiHrCopilotFeedbackClientService feedbackClientService;

    public AiHrCopilotFeedbackController(
            AiHrCopilotFeedbackClientService feedbackClientService
    ) {
        this.feedbackClientService = feedbackClientService;
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping
    public AiHrCopilotFeedbackResponseDto submitFeedback(
            @RequestBody AiHrCopilotFeedbackRequestDto payload
    ) {
        return feedbackClientService.submitFeedback(payload);
    }
}