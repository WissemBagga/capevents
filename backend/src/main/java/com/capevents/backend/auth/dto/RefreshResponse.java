package com.capevents.backend.auth.dto;

public record RefreshResponse(
        String accessToken,
        String tokenType,
        String refreshToken
) {}