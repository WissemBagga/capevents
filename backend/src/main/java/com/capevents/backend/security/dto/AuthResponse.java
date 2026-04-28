package com.capevents.backend.security.dto;

public record AuthResponse (
        String accessToken,
        String tokenType,
        String refreshToken,
        String role,
        boolean emailVerified
){}
