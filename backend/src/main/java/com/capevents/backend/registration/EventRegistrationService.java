package com.capevents.backend.registration;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventAudience;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.mail.EmailService;
import com.capevents.backend.notification.NotificationService;
import com.capevents.backend.registration.dto.EventParticipantResponse;
import com.capevents.backend.registration.dto.RegistrationResponse;
import com.capevents.backend.registration.dto.UnregisterRequest;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
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
    private final NotificationService notificationService;
    private final EmailService emailService;

    public EventRegistrationService(EventRepository eventRepository, UserRepository userRepository, EventRegistrationRepository registrationRepository, NotificationService notificationService, EmailService emailService) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.registrationRepository = registrationRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    @Transactional
    public RegistrationResponse register(UUID eventId, String userEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        validateRegistrationAllowed(event, user);

        EventRegistration registration = registrationRepository.findByEventIdAndUserId(eventId, user.getId())
                .orElse(null);

        if (registration != null && registration.getStatus() == RegistrationStatus.REGISTERED) {
            throw new BadRequestException("Vous êtes déjà inscrit à cet événement");
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
        emailService.sendRegistrationSavedEmail(user.getEmail(), event);
        notificationService.notifyRegistrationSaved(user, event);
        return toResponse(saved);

    }

    @Transactional
    public RegistrationResponse unregister(UUID eventId, String userEmail, UnregisterRequest request) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        if (request == null || request.reason() == null ||  request.reason().isEmpty()) {
            throw new BadRequestException("La raison de désinscription est obligatoire.");
        }




        EventRegistration registration = registrationRepository
                .findByEventIdAndUserId(event.getId(), user.getId())
                .orElseThrow(() -> new NotFoundException("Inscription introuvable"));

        if (registration.getStatus() != RegistrationStatus.REGISTERED) {
            throw new BadRequestException("Vous n’êtes pas inscrit à cet événement");
        }

        registration.setStatus(RegistrationStatus.CANCELLED);
        registration.setCancelledAt(Instant.now());
        registration.setCancelReason(request.reason().trim());
        registration.setCancelComment(
                request.comment() != null && !request.comment().trim().isEmpty()
                    ? request.comment().trim()
                    : null
        );

        EventRegistration saved = registrationRepository.save(registration);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> myRegistrations(String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        return registrationRepository
                .findByUserIdAndStatusOrderByRegisteredAtDesc(user.getId(), RegistrationStatus.REGISTERED)
                .stream()
                .filter(registration -> registration.getEvent() != null)
                .filter(registration -> registration.getEvent().getStatus() == EventStatus.PUBLISHED)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isRegistered(UUID eventId, String userEmail) {
        User user = userRepository.findByEmail(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        return registrationRepository.existsByEventIdAndUserIdAndStatus(
                eventId,
                user.getId(),
                RegistrationStatus.REGISTERED
        );
    }

    @Transactional
    public  List<EventParticipantResponse> eventParticipants(UUID eventId, String actorEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

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
                        reg.getRegisteredAt(),
                        reg.getAttendanceStatus()
                ))
                .toList();
    }


    @Transactional
    public void markAttendance(Long registrationId, AttendanceStatus attendanceStatus, String actorEmail) {
        if (attendanceStatus == null) {
            throw new BadRequestException("Le statut de présence est requis");
        }

        EventRegistration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new NotFoundException("Inscription introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        Event event = registration.getEvent();

        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));

        if (!isHr && !isManager) {
            throw new BadRequestException("Action non autorisée");
        }

        if (!isHr) {
            Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;
            Long eventDeptId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId() : null;

            if (actorDeptId == null || eventDeptId == null || !actorDeptId.equals(eventDeptId)) {
                throw new NotFoundException("Événement introuvable");
            }
        }

        if (registration.getStatus() != RegistrationStatus.REGISTERED) {
            throw new BadRequestException("Seuls les participants inscrits peuvent avoir une présence");
        }

        registration.setAttendanceStatus(attendanceStatus);
        registrationRepository.save(registration);
    }

    private void validateRegistrationAllowed(Event event, User user) {
        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new BadRequestException("Registration is allowed only for published events");
        }

        if (event.getRegistrationDeadline() != null && Instant.now().isAfter(event.getRegistrationDeadline())) {
            throw new BadRequestException("La date limite d'inscription est passée.");
        }

        long registeredCount = registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
        if (event.getCapacity() != null && registeredCount >= event.getCapacity()) {
            throw new BadRequestException("L'événement est complet.");
        }

        boolean isHr = user.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));

        if (!isHr) {
            if (event.getAudience() == EventAudience.DEPARTMENT) {
                if (user.getDepartment() == null
                        || event.getTargetDepartment() == null
                        || !user.getDepartment().getId().equals(event.getTargetDepartment().getId())) {
                    throw new BadRequestException("Cet événement n'est pas visible pour votre département.");
                }
            }
        }
    }

    private RegistrationResponse toResponse(EventRegistration registration) {
        return new RegistrationResponse(
                registration.getId(),
                registration.getEvent().getId(),
                registration.getEvent().getTitle(),
                registration.getEvent().getStartAt(),
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
            throw new NotFoundException("Événement introuvable");
        }

        Long actorDeptId = user.getDepartment() != null ? user.getDepartment().getId() : null;
        Long eventDeptId = null;

        if (event.getCreatedBy() != null && event.getCreatedBy().getDepartment() != null) {
            eventDeptId = event.getCreatedBy().getDepartment().getId();
        }

        if (actorDeptId == null || eventDeptId == null || !actorDeptId.equals(eventDeptId)) {
            throw new NotFoundException("Événement introuvable");
        }

    }
}