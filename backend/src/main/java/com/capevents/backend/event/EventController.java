package com.capevents.backend.event;


import com.capevents.backend.event.dto.CancelEventRequest;
import com.capevents.backend.event.dto.CreateEventRequest;
import com.capevents.backend.event.dto.EventResponse;
import com.capevents.backend.event.dto.UpdateEventRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


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
    public List<EventResponse> listPublishedUpcoming() {
        return eventService.listPublishedUpcoming();
    }

    // Hr peut Publier un event
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping
    public EventResponse createDraft(@Valid @RequestBody CreateEventRequest req, Authentication auth) {
        String email = auth.getName();
        return eventService.createDraftEvent(req, email);
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping("/{id}/publish")
    public EventResponse publish(@PathVariable UUID id) {
        return eventService.publish(id);
    }


    // Details d'un event publie : au public, employe
    @GetMapping("/published/{id}")
    public EventResponse getPublished(@PathVariable UUID id) {
        return eventService.getPublishedById(id);
    }

    // Liste de tous les events : pour HR
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @GetMapping("/admin")
    public List<EventResponse> listAllForHr() {
        return eventService.listAllForHr();
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateEventRequest req) {
        return eventService.update(id, req);
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping("/{id}/cancel")
    public EventResponse cancel(@PathVariable UUID id, @Valid @RequestBody CancelEventRequest req) {
        return eventService.cancel(id, req.reason());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_HR')")
    @PostMapping("/{id}/archive")
    public EventResponse archive(@PathVariable UUID id) {
        return eventService.archive(id);
    }

    @GetMapping("published/search")
    public List<EventResponse> searchPublished(@RequestParam String category) {
        return eventService.searchPublished(category);
    }

}
