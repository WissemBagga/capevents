package com.capevents.backend.controller.ai;


import com.capevents.backend.dto.ai.planning.AiPlanningEventProposalRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningEventProposalResponse;
import com.capevents.backend.dto.ai.planning.AiPlanningSuggestionRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningSuggestionResponse;
import com.capevents.backend.service.ai.AiPlanningClientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/planning")
public class AiPlanningController {

    private final AiPlanningClientService aiPlanningClientService;

    public AiPlanningController(AiPlanningClientService aiPlanningClientService) {
        this.aiPlanningClientService = aiPlanningClientService;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_MANAGER')")
    @PostMapping("/suggestions")
    public AiPlanningSuggestionResponse suggestSlots(
            @RequestBody AiPlanningSuggestionRequest payload
    ) {
        return aiPlanningClientService.suggestSlots(payload);
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping("/event-proposals")
    public AiPlanningEventProposalResponse proposeEvents(
            @RequestBody AiPlanningEventProposalRequest payload
    ) {
        return aiPlanningClientService.proposeEvents(payload);
    }
}