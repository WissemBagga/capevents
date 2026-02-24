package com.capevents.backend.auth.dto;

public record ForgotPasswordResponse(
    String resetToken,
    String message
) {}
