package com.capevents.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthCookieService {

    @Value("${app.security.jwt.refresh-expiration-days}")
    private long refreshExpirationDays;

    public static final String REFRESH_COOKIE_NAME = "capevents_refresh_token";

    public ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(false) // dev local HTTP
                .path("/api/auth")
                .sameSite("Lax")
                .maxAge(Duration.ofDays(refreshExpirationDays))
                .build();
    }

    public ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(false) // dev local HTTP
                .path("/api/auth")
                .sameSite("Lax")
                .maxAge(0)
                .build();
    }
}