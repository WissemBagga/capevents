package com.capevents.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthCookieService {

    public static final String REFRESH_COOKIE_NAME = "capevents_refresh_token";

    @Value("${app.cookies.refresh-name:" + REFRESH_COOKIE_NAME + "}")
    private String refreshCookieName;

    @Value("${app.security.jwt.refresh-expiration-days}")
    private long refreshExpirationDays;

    public String getRefreshCookieName() {
        return refreshCookieName;
    }

    public ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(false) // localhost en HTTP
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(Duration.ofDays(refreshExpirationDays))
                .build();
    }

    public ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(0)
                .build();
    }
}