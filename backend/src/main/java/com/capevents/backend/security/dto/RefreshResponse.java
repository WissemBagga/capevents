package com.capevents.backend.security.dto;

public record RefreshResponse(
        String accessToken,
        String tokenType,
        String refreshToken
) {}