package com.capevents.backend.auth;

import com.capevents.backend.audit.AuditService;
import com.capevents.backend.auth.dto.*;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.department.Department;
import com.capevents.backend.department.DepartmentRepository;
import com.capevents.backend.role.RoleRepository;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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


    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository, AuditService auditService,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordResetTokenRepository passwordResetTokenRepository
            ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @Transactional
    public void register(RegisterRequest req, String remoteAddr){
        if(!req.email().toLowerCase().endsWith("@capgemini.com")){
            throw new IllegalArgumentException("Email must end with @capgemini.com");
        }

        if(userRepository.existsByEmail(req.email().toLowerCase())){
            throw new BadRequestException("Email already used");
        }

        var roleEmployee = roleRepository.findByCode("ROLE_EMPLOYEE")
                .orElseThrow(() -> new IllegalStateException(("ROLE_EMPLOYEE not found in database")));

        Department dept =null;
        if (req.departmentId() != null){
            dept = departmentRepository.findById(req.departmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        }

        User user = new User();
        user.setFirstName(req.firstName());
        user.setLastName(req.lastName());
        user.setEmail(req.email().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setPhone(req.phone());
        user.setDepartment(dept);
        user.getRoles().add(roleEmployee);
        userRepository.save(user);


        auditService.logByEmail(
                user.getEmail(),
                "USER_REGISTERED",
                "USER",
                user.getId().toString(),
                remoteAddr,
                "{\"email\":\"" + user.getEmail() + "\"}"
        );
    }

    public AuthResponse login(LoginRequest req, String remoteAddr){
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().toLowerCase(), req.password())
        );

        var user = userRepository.findByEmailWithRoles(req.email().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        var roleCodes  = user.getRoles().stream().map(r -> r.getCode()).toList();

        String token = jwtService.generateToken(
                req.email().toLowerCase(),
                Map.of(
                        "type", "access",
                        "roles", roleCodes
                )
        );
        auditService.logByEmail(
                req.email().toLowerCase(),
                "LOGIN_SUCCESS",
                "USER",
                null,
                remoteAddr,
                "{\"email\":\"" + req.email().toLowerCase() + "\"}"
        );
        return new AuthResponse(token, "Bearer");
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest req, String remoteAddr) {
        var user = userRepository.findByEmail(req.email().toLowerCase())
                .orElseThrow(() -> new NotFoundException("Email not found"));
        // token random simple (plus tard: SecureRandom + base64)
        String token = java.util.UUID.randomUUID().toString().replace("-", "");

        PasswordResetToken prt = new PasswordResetToken();
        prt.setUser(user);
        prt.setToken(token);
        prt.setExpiresAt(java.time.Instant.now().plusSeconds(15 * 60)); // 15 min

        passwordResetTokenRepository.save(prt);


        auditService.logByEmail(
                req.email().toLowerCase(),
                "PASSWORD_RESET_REQUESTED",
                "USER",
                null,
                remoteAddr,
                "{\"email\":\"" + req.email().toLowerCase() + "\"}"
        );

        // En prod: envoyer email. Pour l'instant on renvoie le token pour tester
        return new ForgotPasswordResponse(token, "Use this token to reset password (valid 15 minutes)");
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req, String remoteAddr) {
        PasswordResetToken prt = passwordResetTokenRepository.findByToken(req.token())
                .orElseThrow(() -> new IllegalArgumentException("Invalid token"));

        if (prt.isUsed()) throw new BadRequestException("Token already used");
        if (prt.isExpired()) throw new IllegalArgumentException("Token expired");

        var user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));

        prt.setUsedAt(java.time.Instant.now());


        auditService.logByEmail(
                null,
                "PASSWORD_RESET_COMPLETED",
                "USER",
                null,
                remoteAddr,
                "{\"token\":\"" + req.token() + "\"}"
        );

        // save (transactional -> auto flush)
        userRepository.save(user);
        passwordResetTokenRepository.save(prt);
    }
}
