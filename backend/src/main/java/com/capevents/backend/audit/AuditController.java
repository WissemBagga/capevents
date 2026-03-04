package com.capevents.backend.audit;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Audit")
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditLogRepository repo;

    public AuditController(AuditLogRepository repo) {
        this.repo = repo;
    }

    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping
    public List<AuditLog> list() {
        return repo.findAll();
    }
}