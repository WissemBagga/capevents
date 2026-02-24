package com.capevents.backend.role;


import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name="Roles")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/roles")
public class RoleController {
    private final RoleService roleService;
    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }


    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping
    public List<Role> listAll() {
        return roleService.listAll();
    }
}
