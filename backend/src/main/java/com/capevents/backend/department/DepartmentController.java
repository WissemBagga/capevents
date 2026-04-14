package com.capevents.backend.department;

import com.capevents.backend.department.dto.CreateDepartmentRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public List<Department> listAll() {
        return departmentService.listAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_HR')")
    public Department create(@Valid @RequestBody CreateDepartmentRequest req) {
        return departmentService.create(req);
    }
}