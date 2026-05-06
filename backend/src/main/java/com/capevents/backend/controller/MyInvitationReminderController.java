package com.capevents.backend.controller;


import com.capevents.backend.dto.MyInvitationReminderResponse;
import com.capevents.backend.service.EventInvitationReminderService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/me/invitations")
public class MyInvitationReminderController {

    private final EventInvitationReminderService eventInvitationReminderService;

    public MyInvitationReminderController(EventInvitationReminderService eventInvitationReminderService) {
        this.eventInvitationReminderService = eventInvitationReminderService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{invitationId}/reminders")
    public List<MyInvitationReminderResponse> getMyInvitationReminderHistory(
            @PathVariable Long invitationId,
            Authentication authentication
    ) {
        return eventInvitationReminderService.getMyInvitationReminderHistory(
                invitationId,
                authentication.getName()
        );
    }
}