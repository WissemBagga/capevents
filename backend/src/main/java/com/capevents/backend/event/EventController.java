package com.capevents.backend.event;


import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.event.dto.CancelEventRequest;
import com.capevents.backend.event.dto.CreateEventRequest;
import com.capevents.backend.event.dto.EventResponse;
import com.capevents.backend.event.dto.UpdateEventRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@SecurityRequirement(name = "bearerAuth")
@Tag(name="Events")
@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    // l'employe peut voir les events publies
    @GetMapping("/published")
    public PageResponse<EventResponse> listPublished(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startAt") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        if (!EVENT_SORT_FIELDS.contains(sortBy)) {
            throw new BadRequestException("Invalid sortBy. Allowed: " + EVENT_SORT_FIELDS);
        }
        Sort.Direction dir = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        var pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));
        return eventService.listPublishedForUserDept(auth.getName(), pageable);
    }

    // Hr peut Publier un event
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PostMapping
    public EventResponse createDraft(@Valid @RequestBody CreateEventRequest req, Authentication auth) {
        String email = auth.getName();
        return eventService.createDraftEvent(req, email);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PostMapping("/{id}/publish")
    public EventResponse publish(@PathVariable UUID id, Authentication auth, HttpServletRequest http) {
        return eventService.publish(id, auth.getName(), http.getRemoteAddr());
    }


    // Details d'un event publie : au public, employe
    @GetMapping("/published/{id}")
    public EventResponse getPublished(@PathVariable UUID id, Authentication auth) {
        return eventService.getPublishedForUserDept(id, auth.getName());
    }

    // Liste de tous les events : pour HR
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/admin")
    public PageResponse<EventResponse> listAllForHr(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        var pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return eventService.listAllForHr(pageable);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateEventRequest req , Authentication auth,HttpServletRequest http) {
        return eventService.update(id, req, auth.getName(), http.getRemoteAddr());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PostMapping("/{id}/cancel")
    public EventResponse cancel(@PathVariable UUID id, @Valid @RequestBody CancelEventRequest req, Authentication auth, HttpServletRequest http) {
        return eventService.cancel(id, req.reason(), auth.getName(), http.getRemoteAddr());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PostMapping("/{id}/archive")
    public EventResponse archive(@PathVariable UUID id, Authentication auth, HttpServletRequest http) {
        return eventService.archive(id, auth.getName(), http.getRemoteAddr());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/admin/{id}")
    public EventResponse getAdminById(@PathVariable UUID id, Authentication auth) {
        return eventService.getAdminById(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/published/search")
    public PageResponse<EventResponse> searchPublished(
            Authentication auth,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "startAt") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        Sort.Direction dir = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        var pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));

        if (!EVENT_SORT_FIELDS.contains(sortBy)) {
            throw new BadRequestException("Invalid sortBy. Allowed: " + EVENT_SORT_FIELDS);
        }
        return eventService.searchPublishedForUserDept(auth.getName(), category, from, to, pageable);
    }

    private static final Set<String> EVENT_SORT_FIELDS = Set.of("startAt","createdAt","title");


    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @GetMapping("/admin/department")
    public List<EventResponse> listForDepartment(Authentication auth) {
        return eventService.listForDepartment(auth.getName());
    }

}
