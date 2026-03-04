package com.capevents.backend.user;

import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.role.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserSummaryDto> listUsers(Pageable pageable) {
        Page<User> users = userRepository.findAll(pageable);
        Page<UserSummaryDto> dtoPage = users.map(this::toSummaryDto);

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


    private UserSummaryDto toSummaryDto(User user) {
        String deptName = (user.getDepartment() != null) ? user.getDepartment().getName() : null;
        /*
        String deptName = null;
        if(user.getDepartment()!=null){
            deptName = user.getDepartment().getName();
        }
        */
        Set<String> roleCodes = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toSet());
    return new UserSummaryDto(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getJobTitle(),
            deptName,
            user.isActive(),
            roleCodes
    );
    }
}