package com.capevents.backend.invitation;


import com.capevents.backend.invitation.dto.MyInvitationResponse;
import com.capevents.backend.invitation.dto.UpdateInvitationResponseRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me/invitations")

public class MyInvitationController {

    private final EventInvitationService invitationService;

    public MyInvitationController(EventInvitationService invitationService) {
        this.invitationService = invitationService;
    }


    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<MyInvitationResponse> getMyInvitations(Authentication auth) {
        return invitationService.getMyInvitations(auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{id}/response")
    public void respondToInvitation(
            @PathVariable Long id,
            @RequestBody UpdateInvitationResponseRequest request,
            Authentication auth
    ) {
        invitationService.respondToInvitation(id, request, auth.getName());
    }
}
