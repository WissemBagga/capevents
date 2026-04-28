package com.capevents.backend.security.dto;

public record RegisterResponse(
        String message,
        String verificationUrl
) {}