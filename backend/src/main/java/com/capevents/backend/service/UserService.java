package com.capevents.backend.service;

import com.capevents.backend.dto.PageResponse;
import com.capevents.backend.exception.BadRequestException;
import com.capevents.backend.exception.NotFoundException;
import com.capevents.backend.entity.User;
import com.capevents.backend.service.mail.EmailService;
import com.capevents.backend.entity.Role;
import com.capevents.backend.repository.RoleRepository;
import com.capevents.backend.repository.UserRepository;
import com.capevents.backend.dto.MyProfileResponse;
import com.capevents.backend.dto.UpdateMyProfileRequest;
import com.capevents.backend.dto.UserSummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, EmailService emailService, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.emailService = emailService;

        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryDto> listUsersForAdmin(String actorEmail, Pageable pageable) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        boolean isHr = actor.getRoles().stream()
                .anyMatch(role -> role.getCode().equals("ROLE_HR"));

        Page<User> usersPage;

        if (isHr) {
            usersPage = userRepository.findAll(pageable);
        } else {
            boolean isManager = actor.getRoles().stream()
                    .anyMatch(role -> role.getCode().equals("ROLE_MANAGER"));

            if (!isManager) {
                throw new BadRequestException("Action non autorisée");
            }

            if (actor.getDepartment() == null) {
                throw new BadRequestException("Le manager n’a pas de département");
            }

            usersPage = userRepository.findByDepartment_Id(actor.getDepartment().getId(), pageable);
        }

        Page<UserSummaryDto> dtoPage = usersPage.map(this::toSummaryDto);

        return new PageResponse<>(
                dtoPage.getContent(),
                dtoPage.getNumber(),
                dtoPage.getSize(),
                dtoPage.getTotalPages(),
                dtoPage.getTotalElements(),
                dtoPage.hasNext(),
                dtoPage.hasPrevious()
        );
    }

    @Transactional(readOnly = true)
    public UserSummaryDto getByEmail(String email){

        User user = userRepository.findByEmailWithRolesAndDepartment(email.toLowerCase())
                .orElseThrow(() -> new NotFoundException("User not found"));

        return toSummaryDto(user);
    }

    private UserSummaryDto toSummaryDto(User user) {
        Long deptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        String deptName = user.getDepartment() != null ? user.getDepartment().getName() : null;

        Set<String> roleCodes = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());

        return new UserSummaryDto(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getJobTitle(),
                deptId,
                deptName,
                user.getAvatarUrl(),
                user.isActive(),
                roleCodes
        );
    }

    @Transactional(readOnly = true)
    public MyProfileResponse getMyProfile(String email) {
        User user = userRepository.findByEmailWithRolesAndDepartment(email.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        return new MyProfileResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.getJobTitle(),
                user.getDepartment() != null ? user.getDepartment().getId() : null,
                user.getDepartment() != null ? user.getDepartment().getName() : null,
                user.getAvatarUrl(),
                user.getRoles().stream().map(Role::getCode).collect(Collectors.toSet())
        );
    }

    @Transactional
    public MyProfileResponse updateMyProfile(String email, UpdateMyProfileRequest req) {
        User user = userRepository.findByEmailWithRolesAndDepartment(email.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        user.setFirstName(req.firstName().trim());
        user.setLastName(req.lastName().trim());
        user.setJobTitle(req.jobTitle() != null && !req.jobTitle().trim().isEmpty() ? req.jobTitle().trim() : null);
        user.setAvatarUrl(req.avatarUrl() != null && !req.avatarUrl().trim().isEmpty() ? req.avatarUrl().trim() : null);

        userRepository.save(user);

        return getMyProfile(email);
    }

    @Transactional
    public UserSummaryDto updateUserRole(UUID userId, String roleCode, boolean confirmHrPromotion) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        Set<String> allowed = Set.of("ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR");
        if (!allowed.contains(roleCode)) {
            throw new BadRequestException("Rôle invalide");
        }

        String currentPrimaryRole = resolvePrimaryRole(user);

        boolean missingEmployeeCompanionRole =
                ("ROLE_MANAGER".equals(currentPrimaryRole) || "ROLE_HR".equals(currentPrimaryRole))
                        && user.getRoles().stream().noneMatch(role -> "ROLE_EMPLOYEE".equals(role.getCode()));

        if (roleCode.equals(currentPrimaryRole) && !missingEmployeeCompanionRole) {
            return toSummaryDto(user);
        }

        if ("ROLE_HR".equals(roleCode)
                && !"ROLE_HR".equals(currentPrimaryRole)
                && !confirmHrPromotion) {
            throw new BadRequestException("La confirmation est obligatoire pour accorder le rôle RH");
        }

        if ("ROLE_MANAGER".equals(roleCode) && !"ROLE_MANAGER".equals(currentPrimaryRole)) {
            if (user.getDepartment() == null) {
                throw new BadRequestException("Impossible d’attribuer le rôle Manager à un utilisateur sans département");
            }

            long otherManagers = userRepository.countOtherManagersInDepartment(
                    user.getDepartment().getId(),
                    user.getId()
            );

            if (otherManagers > 0) {
                throw new BadRequestException("Ce département a déjà un manager");
            }
        }

        if ("ROLE_HR".equals(currentPrimaryRole) && !"ROLE_HR".equals(roleCode)) {
            long hrCount = userRepository.countUsersByRoleCode("ROLE_HR");
            if (hrCount <= 1) {
                throw new BadRequestException("Impossible de modifier le rôle du dernier RH");
            }
        }

        Role newRole = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new NotFoundException("Rôle introuvable"));

        Role employeeRole = roleRepository.findByCode("ROLE_EMPLOYEE")
                .orElseThrow(() -> new NotFoundException("Rôle Employé introuvable"));

        user.getRoles().removeIf(role ->
                "ROLE_EMPLOYEE".equals(role.getCode()) ||
                        "ROLE_MANAGER".equals(role.getCode()) ||
                        "ROLE_HR".equals(role.getCode())
        );

        if ("ROLE_EMPLOYEE".equals(roleCode)) {
            user.getRoles().add(employeeRole);
        } else {
            user.getRoles().add(employeeRole);
            user.getRoles().add(newRole);
        }

        User saved = userRepository.save(user);

        String roleLabel = toRoleLabel(roleCode);

        notificationService.notifyUserRoleChanged(saved, roleLabel);
        emailService.sendRoleChangedEmail(
                saved.getEmail(),
                buildFullName(saved.getFirstName(), saved.getLastName()),
                roleLabel
        );

        return toSummaryDto(saved);
    }

    private String resolvePrimaryRole(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());

        if (roles.contains("ROLE_HR")) return "ROLE_HR";
        if (roles.contains("ROLE_MANAGER")) return "ROLE_MANAGER";
        return "ROLE_EMPLOYEE";
    }

    private String buildFullName(String firstName, String lastName) {
        String safeFirstName = firstName != null ? firstName.trim() : "";
        String safeLastName = lastName != null ? lastName.trim() : "";
        return (safeFirstName + " " + safeLastName).trim();
    }

    private String toRoleLabel(String roleCode) {
        return switch (roleCode) {
            case "ROLE_HR" -> "RH";
            case "ROLE_MANAGER" -> "Manager";
            default -> "Employé";
        };
    }

}