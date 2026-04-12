package com.capevents.backend.user;


import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.user.dto.MyProfileResponse;
import com.capevents.backend.user.dto.UpdateMyProfileRequest;
import com.capevents.backend.user.dto.UserSummaryDto;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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

    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/admin")
    public PageResponse<UserSummaryDto> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication
    ) {

        if (!USER_SORT_FIELDS.contains(sortBy)) {
            throw new BadRequestException("Invalid sortBy. Allowed: " + USER_SORT_FIELDS);
        }
        Sort.Direction direction = sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        var pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return userService.listUsersForAdmin(authentication.getName(), pageable);
    }


    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me/profile")
    public MyProfileResponse getMyProfile(Authentication authentication) {
        return userService.getMyProfile(authentication.getName());
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/me/profile")
    public MyProfileResponse updateMyProfile(
            @Valid @RequestBody UpdateMyProfileRequest req,
            Authentication authentication
    ) {
        return userService.updateMyProfile(authentication.getName(), req);
    }



}
