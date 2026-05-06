package com.capevents.backend.controller.ai;

import com.capevents.backend.dto.ai.recommendation.AiRecommendationResponseDto;
import com.capevents.backend.dto.UserSummaryDto;
import com.capevents.backend.service.UserService;
import com.capevents.backend.service.ai.AiRecommendationClientService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@SecurityRequirement(name = "bearerAuth")
@Tag(name = "AI Recommendations")
@RestController
@RequestMapping("/api/ai/recommendations")
public class AiRecommendationController {

    private final AiRecommendationClientService aiRecommendationClientService;
    private final UserService userService;

    public AiRecommendationController(
            AiRecommendationClientService aiRecommendationClientService,
            UserService userService
    ) {
        this.aiRecommendationClientService = aiRecommendationClientService;
        this.userService = userService;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_EMPLOYEE','ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/users/{userId}")
    public AiRecommendationResponseDto getRecommendationsForUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "6") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 20));

        return aiRecommendationClientService.getRecommendationsForUser(
                userId,
                safeLimit
        );
    }

    @PreAuthorize("hasAnyAuthority('ROLE_EMPLOYEE','ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/me")
    public AiRecommendationResponseDto getMyRecommendations(
            Authentication auth,
            @RequestParam(defaultValue = "6") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 20));

        UserSummaryDto currentUser = userService.getByEmail(auth.getName());

        UUID userId = currentUser.id();

        return aiRecommendationClientService.getRecommendationsForUser(
                userId,
                safeLimit
        );
    }
}