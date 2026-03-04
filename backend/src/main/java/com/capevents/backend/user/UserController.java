package com.capevents.backend.user;


import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@Tag(name="Users")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    private static final Set<String> USER_SORT_FIELDS = Set.of(
            "createdAt", "updatedAt", "email", "firstName", "lastName", "lastLoginAt"
    );

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/admin")
    public PageResponse<UserSummaryDto> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {

        if (!USER_SORT_FIELDS.contains(sortBy)) {
            throw new BadRequestException("Invalid sortBy. Allowed: " + USER_SORT_FIELDS);
        }
        Sort.Direction direction = sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        var pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return userService.listUsers(pageable);
    }

}
