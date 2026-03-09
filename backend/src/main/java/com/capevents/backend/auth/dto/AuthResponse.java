package com.capevents.backend.auth.dto;

public record AuthResponse (
        String accessToken,
        String tokenType,
        String refreshToken,
        String role,
        boolean emailVerified
){}
