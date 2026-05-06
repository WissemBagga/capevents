package com.capevents.backend.controller.ai;


import java.util.UUID;

import com.capevents.backend.dto.ai.feedback.AiFeedbackInsightResponseDto;
import com.capevents.backend.service.ai.AiFeedbackClientService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/feedback")
public class AiFeedbackController {

    private final AiFeedbackClientService aiFeedbackClientService;

    public AiFeedbackController(AiFeedbackClientService aiFeedbackClientService) {
        this.aiFeedbackClientService = aiFeedbackClientService;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_MANAGER')")
    @GetMapping("/events/{eventId}/insights")
    public AiFeedbackInsightResponseDto getEventFeedbackInsights(
            @PathVariable UUID eventId
    ) {
        return aiFeedbackClientService.getEventFeedbackInsights(eventId);
    }
}