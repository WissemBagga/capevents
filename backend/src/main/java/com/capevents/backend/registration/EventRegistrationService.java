package com.capevents.backend.registration;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.registration.dto.EventParticipantResponse;
import com.capevents.backend.registration.dto.RegistrationResponse;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class EventRegistrationService {
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventRegistrationRepository registrationRepository;
    private final AuthenticationManager authenticationManager;

    public EventRegistrationService(EventRepository eventRepository, UserRepository userRepository, EventRegistrationRepository registrationRepository, AuthenticationManager authenticationManager) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.registrationRepository = registrationRepository;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public RegistrationResponse register(UUID eventId, String userEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));

        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("User not found"));

        validateRegistrationAllowed(event, user);

        EventRegistration registration = registrationRepository.findByEventIdAndUserId(eventId, user.getId())
                .orElse(null);

        if (registration != null && registration.getStatus() == RegistrationStatus.REGISTERED) {
            throw new BadRequestException("You are already registered for this event");
        }

        if (registration == null) {
            registration = new EventRegistration();
            registration.setEvent(event);
            registration.setUser(user);
            registration.setRegisteredAt(Instant.now());
        }

        registration.setStatus(RegistrationStatus.REGISTERED);
        registration.setCancelledAt(null);

        EventRegistration saved = registrationRepository.save(registration);
        return toResponse(saved);
    }

    @Transactional
    public RegistrationResponse unregister(UUID eventId, String userEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));

        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("User not found"));

        EventRegistration registration = registrationRepository
                .findByEventIdAndUserId(event.getId(), user.getId())
                .orElseThrow(() -> new NotFoundException("Registration not found"));

        if (registration.getStatus() != RegistrationStatus.REGISTERED) {
            throw new BadRequestException("You are not currently registered for this event");
        }

        registration.setStatus(RegistrationStatus.CANCELLED);
        registration.setCancelledAt(Instant.now());

        EventRegistration saved = registrationRepository.save(registration);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> myRegistrations(String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("User not found"));

        return registrationRepository
                .findByUserIdAndStatusOrderByRegisteredAtDesc(user.getId(), RegistrationStatus.REGISTERED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isRegistered(UUID eventId, String userEmail) {
        User user = userRepository.findByEmail(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("User not found"));

        return registrationRepository.existsByEventIdAndUserIdAndStatus(
                eventId,
                user.getId(),
                RegistrationStatus.REGISTERED
        );
    }

    @Transactional(readOnly = true)
    public long countRegistered(Event event) {
        return registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
    }

    @Transactional
    public  List<EventParticipantResponse> eventParticipants(UUID eventId, String actorEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("User not found"));

        authorizeAdminAccess(actor, event);

        return registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(event, RegistrationStatus.REGISTERED)
                .stream()
                .map(reg -> new EventParticipantResponse(
                        reg.getId(),
                        reg.getUser().getId(),
                        reg.getUser().getFirstName(),
                        reg.getUser().getLastName(),
                        reg.getUser().getEmail(),
                        reg.getUser().getDepartment() != null ? reg.getUser().getDepartment().getName() : null,
                        reg.getRegisteredAt()
                ))
                .toList();
    }

    private void validateRegistrationAllowed(Event event, User user) {
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new BadRequestException("Registration is allowed only for published events");
        }

        if (event.getRegistrationDeadline() != null && Instant.now().isAfter(event.getRegistrationDeadline())) {
            throw new BadRequestException("Registration deadline has passed");
        }

        long registeredCount = registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
        if (event.getCapacity() != null && registeredCount >= event.getCapacity()) {
            throw new BadRequestException("Event is full");
        }

        // TODO later:
        // check audience visibility for user
        // check active user only if needed
    }

    private RegistrationResponse toResponse(EventRegistration registration) {
        return new RegistrationResponse(
                registration.getId(),
                registration.getEvent().getId(),
                registration.getEvent().getTitle(),
                registration.getStatus(),
                registration.getRegisteredAt(),
                registration.getCancelledAt()
        );
    }

    private void authorizeAdminAccess(User user, Event event) {
        boolean isHr = user.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) return; // HR can access all events

        boolean isManager = user.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new NotFoundException("Event not found");
        }

        Long actorDeptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        Long eventDeptId = null;

        if (event.getCreatedBy() != null && event.getCreatedBy().getDepartment() != null) {
            eventDeptId = event.getCreatedBy().getDepartment().getId();
        }

        if (actorDeptId == null || eventDeptId == null || !actorDeptId.equals(eventDeptId)) {
            throw new NotFoundException("Event not found");
        }

    }



}