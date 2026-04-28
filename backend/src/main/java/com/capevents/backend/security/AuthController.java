package com.capevents.backend.security;


import com.capevents.backend.security.dto.*;
import com.capevents.backend.security.dto.VerifyEmailRequest;
import com.capevents.backend.exception.BadRequestException;
import com.capevents.backend.service.UserService;
import com.capevents.backend.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.Cookie;
import org.springframework.web.util.WebUtils;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserService  userService;
    private final AuthCookieService authCookieService;
    public AuthController(AuthService authService, UserService userService, AuthCookieService authCookieService) {
        this.authService = authService;
        this.userService = userService;
        this.authCookieService = authCookieService;
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
        authService.register(req, http.getRemoteAddr());
        return ResponseEntity.ok().build();
    }


    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        AuthResponse response = authService.login(req, http.getRemoteAddr());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.buildRefreshCookie(response.refreshToken()).toString())
                .body(new AuthResponse(
                        response.accessToken(),
                        response.tokenType(),
                        null,
                        response.role(),
                        response.emailVerified()
                ));
    }


    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(HttpServletRequest http) {
        String refreshToken = extractRefreshToken(http);

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadRequestException("Refresh token manquant");
        }

        RefreshResponse response = authService.refresh(refreshToken, http.getRemoteAddr());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.buildRefreshCookie(response.refreshToken()).toString())
                .body(new RefreshResponse(
                        response.accessToken(),
                        response.tokenType(),
                        null
                ));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest http) {
        String refreshToken = extractRefreshToken(http);

        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken, http.getRemoteAddr());
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, authCookieService.clearRefreshCookie().toString())
                .build();
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgot(@Valid @RequestBody ForgotPasswordRequest req, HttpServletRequest http) {
        return authService.forgotPassword(req, http.getRemoteAddr());
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> reset(@Valid @RequestBody ResetPasswordRequest req, HttpServletRequest http) {
        authService.resetPassword(req, http.getRemoteAddr());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest req, HttpServletRequest http) {
        authService.verifyEmail(req.token(), http.getRemoteAddr());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest req, HttpServletRequest http) {
        authService.resendVerification(req.email(), http.getRemoteAddr());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    public UserSummaryDto me(Authentication auth) {
        return userService.getByEmail(auth.getName());
    }

    private String extractRefreshToken(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, authCookieService.getRefreshCookieName());
        return cookie != null ? cookie.getValue() : null;
    }

}
