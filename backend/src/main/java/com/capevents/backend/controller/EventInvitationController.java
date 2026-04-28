package com.capevents.backend.controller;

import com.capevents.backend.dto.*;
import com.capevents.backend.service.EventInvitationService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
public class EventInvitationController {

    private final EventInvitationService invitationService;

    public EventInvitationController(EventInvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PostMapping("/{id}/invite")
    public SendInvitationResponse sendInvitations(
            @PathVariable UUID id,
            @RequestBody SendInvitationRequest req,
            Authentication auth
    ) {
        return invitationService.sendInvitations(id, req, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/{id}/invitations")
    public List<AdminEventInvitationResponse> getEventInvitations(
            @PathVariable UUID id,
            Authentication auth
    ) {
        return invitationService.getEventInvitations(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @PostMapping("/{id}/employee-invite")
    public SendInvitationResponse sendEmployeeInvitations(
            @PathVariable UUID id,
            @RequestBody EmployeeInviteRequest req,
            Authentication auth
    ) {
        return invitationService.sendEmployeeInvitations(id, req, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/{id}/employee-invitable-users")
    public List<EmployeeInvitableUserResponse> getEmployeeInvitableUsers(
            @PathVariable UUID id,
            Authentication auth
    ) {
        return invitationService.getEmployeeInvitableUsers(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/{id}/my-sent-invitations")
    public List<AdminEventInvitationResponse> getMySentInvitations(
            @PathVariable UUID id,
            Authentication auth
    ) {
        return invitationService.getMySentInvitations(id, auth.getName());
    }

}
