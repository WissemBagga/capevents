package com.capevents.backend.registration;

import com.capevents.backend.registration.dto.EventParticipantResponse;
import com.capevents.backend.registration.dto.RegistrationResponse;
import com.capevents.backend.registration.dto.UpdateAttendanceRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class EventRegistrationController {

    private final EventRegistrationService registrationService;

    public EventRegistrationController(EventRegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @PostMapping("/events/{id}/register")
    public RegistrationResponse register(@PathVariable UUID id, Authentication auth) {
        return registrationService.register(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @PostMapping("/events/{id}/unregister")
    public RegistrationResponse unregister(@PathVariable UUID id, Authentication auth) {
        return registrationService.unregister(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/me/registrations")
    public List<RegistrationResponse> myRegistrations(Authentication auth) {
        return registrationService.myRegistrations(auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYEE')")
    @GetMapping("/events/{id}/registration-status")
    public boolean registrationStatus(@PathVariable UUID id, Authentication auth) {
        return registrationService.isRegistered(id, auth.getName());
    }

    @SecurityRequirement(name="bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR', 'ROLE_MANAGER')")
    @GetMapping("/events/admin/{id}/participants")
    public List<EventParticipantResponse> eventParticipants(@PathVariable UUID id, Authentication auth) {
        return registrationService.eventParticipants(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAnyAuthority('ROLE_HR','ROLE_MANAGER')")
    @PostMapping("/api/registrations/{registrationId}/attendance")
    public void markAttendance(
            @PathVariable Long registrationId,
            @RequestBody UpdateAttendanceRequest request,
            Authentication auth
    ) {
        registrationService.markAttendance(
                registrationId,
                request.attendanceStatus(),
                auth.getName()
        );
    }
}