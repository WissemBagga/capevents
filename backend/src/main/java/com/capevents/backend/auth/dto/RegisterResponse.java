package com.capevents.backend.auth.dto;

public record RegisterResponse(
        String message,
        String verificationUrl
) {}