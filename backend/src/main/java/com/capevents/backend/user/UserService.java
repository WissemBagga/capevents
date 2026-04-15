package com.capevents.backend.user;

import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.role.Role;
import com.capevents.backend.role.RoleRepository;
import com.capevents.backend.user.dto.MyProfileResponse;
import com.capevents.backend.user.dto.UpdateMyProfileRequest;
import com.capevents.backend.user.dto.UserSummaryDto;
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

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
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
    public UserSummaryDto updateUserRole(UUID userId, String roleCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        Set<String> allowed = Set.of("ROLE_EMPLOYEE", "ROLE_MANAGER", "ROLE_HR");
        if (!allowed.contains(roleCode)) {
            throw new BadRequestException("Rôle invalide");
        }

        Role newRole = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new NotFoundException("Rôle introuvable"));

        user.getRoles().removeIf(role ->
                "ROLE_EMPLOYEE".equals(role.getCode()) ||
                        "ROLE_MANAGER".equals(role.getCode()) ||
                        "ROLE_HR".equals(role.getCode())
        );

        user.getRoles().add(newRole);

        User saved = userRepository.save(user);
        return toSummaryDto(saved);
    }

}