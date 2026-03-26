package com.capevents.backend.invitation;

import com.capevents.backend.invitation.dto.SendInvitationRequest;
import com.capevents.backend.invitation.dto.SendInvitationResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
}