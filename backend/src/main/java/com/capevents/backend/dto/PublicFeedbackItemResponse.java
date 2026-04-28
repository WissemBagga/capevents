package com.capevents.backend.dto;

public record PublicFeedbackItemResponse(
        int rating,
        String comment
) {}