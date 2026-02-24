package com.capevents.backend.auth;

import com.capevents.backend.auth.dto.*;
import com.capevents.backend.config.BadRequestException;
import com.capevents.backend.config.NotFoundException;
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
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;


    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            DepartmentRepository departmentRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordResetTokenRepository passwordResetTokenRepository
            ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @Transactional
    public void register(RegisterRequest req){
        if(!req.email().toLowerCase().endsWith("@capgemini.com")){
            throw new IllegalArgumentException("Email must end with @capgemini.com");
        }

        if(userRepository.existsByEmail(req.email().toLowerCase())){
            throw new BadRequestException("Email already used");
        }

        var roleEmployee = roleRepository.findByCode("ROLE_EMPLOYEE")
                .orElseThrow(() -> new IllegalStateException(("ROLE_EMPLOYEE not found in database")));

        Department dept =null;
        if (req.departementId() != null){
            dept = departmentRepository.findById(req.departementId())
                    .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        }

        User user = new User();
        user.setFirstName(req.firstName());
        user.setLastName(req.firstName());
        user.setEmail(req.email().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setPhone(req.phone());
        user.setDepartment(dept);
        user.getRoles().add(roleEmployee);
        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest req){
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
        return new AuthResponse(token, "Bearer");
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest req) {
        var user = userRepository.findByEmail(req.email().toLowerCase())
                .orElseThrow(() -> new NotFoundException("Email not found"));
        // token random simple (plus tard: SecureRandom + base64)
        String token = java.util.UUID.randomUUID().toString().replace("-", "");

        PasswordResetToken prt = new PasswordResetToken();
        prt.setUser(user);
        prt.setToken(token);
        prt.setExpiresAt(java.time.Instant.now().plusSeconds(15 * 60)); // 15 min

        passwordResetTokenRepository.save(prt);

        // En prod: envoyer email. Pour l'instant on renvoie le token pour tester
        return new ForgotPasswordResponse(token, "Use this token to reset password (valid 15 minutes)");
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        PasswordResetToken prt = passwordResetTokenRepository.findByToken(req.token())
                .orElseThrow(() -> new IllegalArgumentException("Invalid token"));

        if (prt.isUsed()) throw new BadRequestException("Token already used");
        if (prt.isExpired()) throw new IllegalArgumentException("Token expired");

        var user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));

        prt.setUsedAt(java.time.Instant.now());

        // save (transactional -> auto flush)
        userRepository.save(user);
        passwordResetTokenRepository.save(prt);
    }
}
