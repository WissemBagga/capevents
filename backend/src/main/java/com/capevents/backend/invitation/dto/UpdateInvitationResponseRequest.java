package com.capevents.backend.invitation.dto;

import com.capevents.backend.invitation.InvitationResponseStatus;

public record UpdateInvitationResponseRequest(
        InvitationResponseStatus response
)
{
}
