package com.capevents.backend.feedback.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record CreateEventFeedbackRequest(
        @Min(1) @Max(5) Integer rating,
        @Size(max = 2000) String comment,
        Boolean shareCommentPublicly
) {
}