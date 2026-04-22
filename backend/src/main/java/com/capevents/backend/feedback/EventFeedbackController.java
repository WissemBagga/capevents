package com.capevents.backend.feedback;

import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.feedback.dto.CreateEventFeedbackRequest;
import com.capevents.backend.feedback.dto.EventFeedbackResponse;
import com.capevents.backend.feedback.dto.PastEventCardResponse;
import com.capevents.backend.feedback.dto.PastEventFeedbackDetailsResponse;
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

    @GetMapping("/past")
    public PageResponse<PastEventCardResponse> listPastEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String audience,
            @RequestParam(required = false) String q
    ) {
        var pageable = org.springframework.data.domain.PageRequest.of(
                page,
                size,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "startAt")
        );

        var items = feedbackService.listPastEvents(category, departmentId, audience, q, pageable);

        return new PageResponse<>(
                items,
                page,
                size,
                1,
                items.size(),
                false,
                page > 0
        );
    }

    @GetMapping("/{eventId}/public-feedback")
    public PastEventFeedbackDetailsResponse getPublicFeedbackDetails(@PathVariable UUID eventId) {
        return feedbackService.getPublicFeedbackDetails(eventId);
    }
}