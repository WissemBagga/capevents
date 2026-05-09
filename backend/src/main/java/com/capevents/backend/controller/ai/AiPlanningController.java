package com.capevents.backend.controller.ai;


import com.capevents.backend.dto.ai.monitoring.AiPlanningUsageRequest;
import com.capevents.backend.dto.ai.monitoring.AiPlanningUsageResponse;
import com.capevents.backend.dto.ai.planning.AiPlanningEventProposalRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningEventProposalResponse;
import com.capevents.backend.dto.ai.planning.AiPlanningSuggestionRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningSuggestionResponse;
import com.capevents.backend.entity.User;
import com.capevents.backend.repository.UserRepository;
import com.capevents.backend.service.ai.AiPlanningClientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ai/planning")
public class AiPlanningController {

    private final AiPlanningClientService aiPlanningClientService;
    private final UserRepository userRepository;

    public AiPlanningController(
            AiPlanningClientService aiPlanningClientService,
            UserRepository userRepository
    ) {
        this.aiPlanningClientService = aiPlanningClientService;
        this.userRepository = userRepository;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_MANAGER')")
    @PostMapping("/suggestions")
    public AiPlanningSuggestionResponse suggestSlots(
            @RequestBody AiPlanningSuggestionRequest payload,
            Authentication authentication
    ) {
        AiPlanningSuggestionRequest securedPayload =
                secureSuggestionPayloadForCurrentUser(payload, authentication);

        return aiPlanningClientService.suggestSlots(securedPayload);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_MANAGER')")
    @PostMapping("/event-proposals")
    public AiPlanningEventProposalResponse proposeEvents(
            @RequestBody AiPlanningEventProposalRequest payload,
            Authentication authentication
    ) {
        AiPlanningEventProposalRequest securedPayload =
                secureProposalPayloadForCurrentUser(payload, authentication);

        return aiPlanningClientService.proposeEvents(securedPayload);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_MANAGER')")
    @PostMapping("/usage")
    public AiPlanningUsageResponse logUsage(
            @RequestBody AiPlanningUsageRequest payload
    ) {
        return aiPlanningClientService.logUsage(payload);
    }

    private AiPlanningSuggestionRequest secureSuggestionPayloadForCurrentUser(
            AiPlanningSuggestionRequest payload,
            Authentication authentication
    ) {
        if (hasAuthority(authentication, "ROLE_HR")) {
            return payload;
        }

        if (hasAuthority(authentication, "ROLE_MANAGER")) {
            Long managerDepartmentId = getCurrentUserDepartmentId(authentication);

            return new AiPlanningSuggestionRequest(
                    payload.category(),
                    "DEPARTMENT",
                    payload.locationType(),
                    managerDepartmentId,
                    payload.durationMinutes(),
                    payload.capacity(),
                    payload.fromDate(),
                    payload.daysHorizon(),
                    payload.limit()
            );
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private AiPlanningEventProposalRequest secureProposalPayloadForCurrentUser(
            AiPlanningEventProposalRequest payload,
            Authentication authentication
    ) {
        if (hasAuthority(authentication, "ROLE_HR")) {
            return payload;
        }

        if (hasAuthority(authentication, "ROLE_MANAGER")) {
            Long managerDepartmentId = getCurrentUserDepartmentId(authentication);

            return new AiPlanningEventProposalRequest(
                    payload.referenceDate(),
                    managerDepartmentId,
                    payload.limit(),
                    payload.slotLimit(),
                    payload.daysHorizon()
            );
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication != null
                && authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority::equals);
    }

    private Long getCurrentUserDepartmentId(Authentication authentication) {
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Utilisateur connecté introuvable."
                ));

        if (user.getDepartment() == null || user.getDepartment().getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Le manager connecté n’est rattaché à aucun département."
            );
        }

        return user.getDepartment().getId();
    }
}