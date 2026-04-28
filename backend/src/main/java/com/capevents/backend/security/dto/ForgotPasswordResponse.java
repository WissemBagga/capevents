package com.capevents.backend.security.dto;

public record ForgotPasswordResponse(
    String resetToken,
    String message
) {}
