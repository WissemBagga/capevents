package com.capevents.backend.controller;


import com.capevents.backend.dto.InvitationReminderRequest;
import com.capevents.backend.dto.InvitationReminderResponse;
import com.capevents.backend.service.EventInvitationReminderService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin/events/{eventId}/invitations/reminders")
public class EventInvitationReminderController {

    private final EventInvitationReminderService eventInvitationReminderService;

    public EventInvitationReminderController(
            EventInvitationReminderService eventInvitationReminderService
    ) {
        this.eventInvitationReminderService = eventInvitationReminderService;
    }

    @PostMapping
    public InvitationReminderResponse sendPendingInvitationReminders(
            @PathVariable UUID eventId,
            @RequestBody(required = false) InvitationReminderRequest request,
            Authentication authentication
    ) {
        return eventInvitationReminderService.sendPendingInvitationReminders(
                eventId,
                authentication.getName(),
                request != null ? request.message() : null
        );
    }
}