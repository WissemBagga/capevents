package com.capevents.backend.audit;

import com.capevents.backend.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;



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
    public PageResponse<AuditLog> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        var pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<AuditLog> p = repo.findAll(pageable);

        return new PageResponse<>(
                p.getContent(), p.getNumber(), p.getSize(), p.getTotalPages(),
                p.getTotalElements(), p.hasNext(), p.hasPrevious()
        );
    }
}