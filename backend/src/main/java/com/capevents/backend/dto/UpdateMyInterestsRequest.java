package com.capevents.backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateMyInterestsRequest(
        @NotEmpty
        @Size(min = 1, max = 6)
        List<Long> interestIds
) {
}