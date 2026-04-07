package com.capevents.backend.feedback;

import com.capevents.backend.feedback.dto.CreateEventFeedbackRequest;
import com.capevents.backend.feedback.dto.EventFeedbackResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
public class EventFeedbackController {

    private final EventFeedbackService feedbackService;

    public EventFeedbackController(EventFeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @PostMapping("/{id}/feedback")
    public EventFeedbackResponse create(
            @PathVariable UUID id,
            @Valid @RequestBody CreateEventFeedbackRequest req,
            Authentication auth
    ) {
        return feedbackService.create(id, req, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/{id}/feedback/me")
    public EventFeedbackResponse getMyFeedback(
            @PathVariable UUID id,
            Authentication auth
    ) {
        return feedbackService.getMyFeedback(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/admin/{id}/feedback")
    public List<EventFeedbackResponse> listEventFeedbacks(
            @PathVariable UUID id,
            Authentication auth
    ) {
        return feedbackService.listEventFeedbacks(id, auth.getName());
    }
}