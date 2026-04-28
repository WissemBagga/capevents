package com.capevents.backend.dto;

import com.capevents.backend.entity.enums.InvitationResponseStatus;

public record UpdateInvitationResponseRequest(
        InvitationResponseStatus response
)
{
}
