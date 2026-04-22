package com.capevents.backend.feedback.dto;

public record PublicFeedbackItemResponse(
        int rating,
        String comment
) {}