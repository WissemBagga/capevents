package com.capevents.backend.user;

import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.role.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
                user.isActive(),
                roleCodes
        );
    }
}