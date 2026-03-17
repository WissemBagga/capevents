package com.capevents.backend.auth;

import com.capevents.backend.audit.AuditService;
import com.capevents.backend.auth.dto.*;
import com.capevents.backend.auth.mail.EmailService;
import com.capevents.backend.auth.token.*;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.config.AppSecurityProperties;
import com.capevents.backend.department.Department;
import com.capevents.backend.department.DepartmentRepository;
import com.capevents.backend.role.RoleRepository;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final EmailService emailService;
    private final AppSecurityProperties appSecurityProperties;

    @Value("${app.security.jwt.refresh-expiration-days}")
    private long refreshExpirationDays;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            AuditService auditService,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            RefreshTokenRepository refreshTokenRepository,
            EmailVerificationTokenRepository emailVerificationTokenRepository,
            EmailService emailService,
            AppSecurityProperties appSecurityProperties
            ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
        this.emailService = emailService;
        this.appSecurityProperties = appSecurityProperties;
    }

    @Transactional
    public void register(RegisterRequest req, String remoteAddr) {
        String email = req.email().toLowerCase();

        if (!isAllowedEmailDomain(email)) {
            throw new BadRequestException("Email domain is not allowed");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already used");
        }

        validatePasswordStrength(req.password());

        var roleEmployee = roleRepository.findByCode("ROLE_EMPLOYEE")
                .orElseThrow(() -> new IllegalStateException("ROLE_EMPLOYEE not found in database"));

        Department dept = null;
        if (req.departmentId() != null) {
            dept = departmentRepository.findById(req.departmentId())
                    .orElseThrow(() -> new BadRequestException("Department not found"));
        }

        User user = new User();
        user.setFirstName(req.firstName());
        user.setLastName(req.lastName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setPhone(req.phone());
        user.setDepartment(dept);
        user.setEmailVerified(false);
        user.getRoles().add(roleEmployee);

        userRepository.save(user);

        String rawToken = randomToken();
        String tokenHash = sha256Hex(rawToken);

        EmailVerificationToken evt = new EmailVerificationToken();
        evt.setUser(user);
        evt.setTokenHash(tokenHash);
        evt.setExpiresAt(Instant.now().plusSeconds(24 * 3600));
        emailVerificationTokenRepository.save(evt);

        emailService.sendVerificationEmail(user.getEmail(), rawToken);

        auditService.logByEmail(
                user.getEmail(),
                "USER_REGISTERED",
                "USER",
                user.getId().toString(),
                remoteAddr,
                "{\"email\":\"" + user.getEmail() + "\"}"
        );
    }

    public AuthResponse login(LoginRequest req, String remoteAddr) {
        String email = req.email().toLowerCase();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, req.password())
        );

        var user = userRepository.findByEmailWithRoles(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));


        if (!user.isActive()) {
            throw new BadRequestException("User is not active");
        }
        if (!user.isEmailVerified()) {
            throw new BadRequestException("Email is not verified");
        }

        var roleCodes = user.getRoles().stream()
                .map(r -> r.getCode())
                .toList();

        String accessToken = jwtService.generateAccessToken(
                email,
                Map.of(
                        "type", "access",
                        "roles", roleCodes
                )
        );

        String refreshRaw = randomToken();
        String refreshHash = sha256Hex(refreshRaw);

        RefreshToken rt = new RefreshToken();
        rt.setUser(user);
        rt.setTokenHash(refreshHash);
        rt.setExpiresAt(Instant.now().plusSeconds(refreshExpirationDays * 24 * 3600));

        user.setLastLoginAt(Instant.now());
        refreshTokenRepository.save(rt);

        auditService.logByEmail(
                email,
                "LOGIN_SUCCESS",
                "USER",
                user.getId().toString(),
                remoteAddr,
                "{\"email\":\"" + email + "\"}"
        );

        String mainRole = resolveMainRole(roleCodes);

        return new AuthResponse(accessToken, "Bearer", refreshRaw, mainRole, user.isEmailVerified());
    }



    @Transactional
    public RefreshResponse refresh(RefreshRequest req, String remoteAddr) {
        String hash = sha256Hex(req.refreshToken());

        RefreshToken oldToken = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (oldToken.isRevoked()) {
            throw new BadRequestException("Refresh token revoked");
        }
        if (oldToken.isExpired()) {
            throw new BadRequestException("Refresh token expired");
        }

        User user = oldToken.getUser();
        if (!user.isActive()) {
            throw new BadRequestException("User is not active");
        }

        var roleCodes = user.getRoles().stream()
                .map(r -> r.getCode())
                .toList();

        String newAccess = jwtService.generateAccessToken(
                user.getEmail(),
                Map.of("type", "access", "roles", roleCodes)
        );

        oldToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(oldToken);

        String newRefreshRaw = randomToken();
        String newRefreshHash = sha256Hex(newRefreshRaw);

        RefreshToken newToken = new RefreshToken();
        newToken.setUser(user);
        newToken.setTokenHash(newRefreshHash);
        newToken.setExpiresAt(Instant.now().plusSeconds(refreshExpirationDays * 24 * 3600));
        refreshTokenRepository.save(newToken);

        auditService.logByEmail(
                user.getEmail(),
                "TOKEN_REFRESHED",
                "USER",
                user.getId() != null ? user.getId().toString() : null,
                remoteAddr,
                "{\"email\":\"" + user.getEmail() + "\"}"
        );

        return new RefreshResponse(newAccess, "Bearer", newRefreshRaw);
    }

    @Transactional
    public void logout(RefreshRequest req, String remoteAddr) {
        String hash = sha256Hex(req.refreshToken());

        var rtOpt = refreshTokenRepository.findByTokenHash(hash);
        if (rtOpt.isEmpty()) {
            return;
        }

        RefreshToken rt = rtOpt.get();
        if (!rt.isRevoked()) {
            rt.setRevokedAt(Instant.now());
            refreshTokenRepository.save(rt);

            auditService.logByEmail(
                    rt.getUser().getEmail(),
                    "LOGOUT",
                    "USER",
                    rt.getUser().getId().toString(),
                    remoteAddr,
                    "{}"
            );
        }
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest req, String remoteAddr) {
        String email = req.email().toLowerCase();

        userRepository.findByEmail(email).ifPresent(user -> {
            String rawToken = randomToken();
            String tokenHash = sha256Hex(rawToken);

            PasswordResetToken prt = new PasswordResetToken();
            prt.setUser(user);
            prt.setTokenHash(tokenHash);
            prt.setExpiresAt(Instant.now().plusSeconds(15 * 60));

            passwordResetTokenRepository.markAllUnusedByUserId(user.getId(), Instant.now());
            passwordResetTokenRepository.save(prt);

            emailService.sendResetPasswordEmail(user.getEmail(), rawToken); // email envoyee

            auditService.logByEmail(
                    email,
                    "PASSWORD_RESET_REQUESTED",
                    "USER",
                    user.getId().toString(),
                    remoteAddr,
                    "{\"email\":\"" + email + "\"}"
            );
        });

        return new ForgotPasswordResponse(null, "If the email exists, you will receive a reset link.");
    }





    @Transactional
    public void resendVerification(String email, String remoteAddr) {
        String normalizedEmail = email.toLowerCase();

        var userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();

            if (user.isActive() && !user.isEmailVerified()) {
                emailVerificationTokenRepository.markAllUnusedByUserId(user.getId(), Instant.now());
                String rawToken = randomToken();
                String tokenHash = sha256Hex(rawToken);

                EmailVerificationToken evt = new EmailVerificationToken();
                evt.setUser(user);
                evt.setTokenHash(tokenHash);
                evt.setExpiresAt(Instant.now().plusSeconds(24L * 3600));
                emailVerificationTokenRepository.save(evt);

                emailService.sendVerificationEmail(user.getEmail(), rawToken);

                auditService.logByEmail(
                        user.getEmail(),
                        "EMAIL_VERIFICATION_RESENT",
                        "USER",
                        user.getId().toString(),
                        remoteAddr,
                        "{\"email\":\"" + user.getEmail() + "\"}"
                );

            }
        }
    }

    @Transactional
    public void verifyEmail(String rawToken, String remoteAddr) {
        EmailVerificationToken evt = emailVerificationTokenRepository.findByTokenHash(sha256Hex(rawToken))
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        if (evt.isUsed()) {
            throw new BadRequestException("Verification token already used");
        }

        if (evt.isExpired()) {
            throw new BadRequestException("Verification token expired");
        }

        User user = evt.getUser();
        user.setEmailVerified(true);
        evt.setUsedAt(Instant.now());

        userRepository.save(user);
        emailVerificationTokenRepository.save(evt);

        auditService.logByEmail(
                user.getEmail(),
                "EMAIL_VERIFIED",
                "USER",
                user.getId().toString(),
                remoteAddr,
                "{\"email\":\"" + user.getEmail() + "\"}"
        );
    }


    @Transactional
    public void resetPassword(ResetPasswordRequest req, String remoteAddr) {
        validatePasswordStrength(req.newPassword());

        PasswordResetToken prt = passwordResetTokenRepository.findByTokenHash(sha256Hex(req.token()))
                .orElseThrow(() -> new BadRequestException("Invalid token"));

        if (prt.isUsed()) throw new BadRequestException("Token already used");
        if (prt.isExpired()) throw new BadRequestException("Token expired");

        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));

        prt.setUsedAt(Instant.now());

        refreshTokenRepository.revokeAllActiveByUserId(user.getId(), Instant.now());

        auditService.logByEmail(
                user.getEmail(),
                "PASSWORD_RESET_COMPLETED",
                "USER",
                user.getId().toString(),
                remoteAddr,
                "{}"
        );

        userRepository.save(user);
        passwordResetTokenRepository.save(prt);
    }


    private static String sha256Hex(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
    private static String randomToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes); // 64 hex chars
    }


    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new BadRequestException("Password must contain at least 8 characters");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new BadRequestException("Password must contain at least one uppercase letter");
        }
        if (!password.matches(".*\\d.*")) {
            throw new BadRequestException("Password must contain at least one digit");
        }
        if (!password.matches(".*[\\W_].*")) {
            throw new BadRequestException("Password must contain at least one special character");
        }
    }

    private boolean isAllowedEmailDomain(String email) {
        String lower = email.toLowerCase();
        int atIndex = lower.lastIndexOf("@");
        if (atIndex < 0) {
            return false;
        }
        String domain = lower.substring(atIndex + 1);

        return appSecurityProperties.getAllowedEmailDomains()
                .stream()
                .map(String::toLowerCase)
                .anyMatch(domain::equals);
    }


    private String resolveMainRole(List<String> roleCodes) {
        if (roleCodes.contains("ROLE_HR")) {
            return "HR";
        }
        if (roleCodes.contains("ROLE_MANAGER")) {
            return "MANAGER";
        }
        return "EMPLOYEE";
    }



}
