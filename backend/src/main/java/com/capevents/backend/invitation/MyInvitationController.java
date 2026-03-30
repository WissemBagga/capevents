package com.capevents.backend.invitation;


import com.capevents.backend.invitation.dto.MyInvitationResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
