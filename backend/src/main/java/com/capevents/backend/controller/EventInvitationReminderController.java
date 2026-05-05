package com.capevents.backend.controller;


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

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping
    public InvitationReminderResponse sendPendingInvitationReminders(
            @PathVariable UUID eventId,
            Authentication authentication
    ) {
        return eventInvitationReminderService.sendPendingInvitationReminders(
                eventId,
                authentication.getName()
        );
    }
}