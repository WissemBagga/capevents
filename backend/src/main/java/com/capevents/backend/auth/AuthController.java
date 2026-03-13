package com.capevents.backend.auth;


import com.capevents.backend.auth.dto.*;
import com.capevents.backend.auth.dto.VerifyEmailRequest;
import com.capevents.backend.user.UserService;
import com.capevents.backend.user.UserSummaryDto;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserService  userService;
    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http) {
        authService.register(req, http.getRemoteAddr());
        return ResponseEntity.ok().build();
    }


    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return authService.login(req, http.getRemoteAddr());
    }


    @PostMapping("/refresh")
    public RefreshResponse refresh(@Valid @RequestBody RefreshRequest req, HttpServletRequest http) {
        return authService.refresh(req, http.getRemoteAddr());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest req, HttpServletRequest http) {
        authService.logout(req, http.getRemoteAddr());
        return ResponseEntity.ok().build();
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

}
