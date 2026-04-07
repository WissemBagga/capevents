package com.capevents.backend.feedback;

import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventAudience;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.feedback.dto.CreateEventFeedbackRequest;
import com.capevents.backend.feedback.dto.EventFeedbackResponse;
import com.capevents.backend.registration.AttendanceStatus;
import com.capevents.backend.registration.EventRegistration;
import com.capevents.backend.registration.EventRegistrationRepository;
import com.capevents.backend.registration.RegistrationStatus;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class EventFeedbackService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final EventFeedbackRepository feedbackRepository;
    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final UserRepository userRepository;

    public EventFeedbackService(
            EventFeedbackRepository feedbackRepository,
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            UserRepository userRepository
    ) {
        this.feedbackRepository = feedbackRepository;
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public EventFeedbackResponse create(UUID eventId, CreateEventFeedbackRequest req, String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        validateFeedbackCreation(event, user, eventId);

        if (feedbackRepository.existsByEventIdAndUserId(eventId, user.getId())) {
            throw new BadRequestException("Vous avez déjà envoyé un feedback pour cet événement.");
        }

        EventFeedback feedback = new EventFeedback();
        feedback.setEvent(event);
        feedback.setUser(user);
        feedback.setRating(req.rating());
        feedback.setComment(normalizeComment(req.comment()));

        EventFeedback saved = feedbackRepository.save(feedback);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public EventFeedbackResponse getMyFeedback(UUID eventId, String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        EventFeedback feedback = feedbackRepository.findByEventIdAndUserId(eventId, user.getId())
                .orElseThrow(() -> new NotFoundException("Feedback introuvable"));

        return toResponse(feedback);
    }

    @Transactional(readOnly = true)
    public List<EventFeedbackResponse> listEventFeedbacks(UUID eventId, String actorEmail) {
        Event event = eventRepository.findByIdWithCreatorDept(eventId)
                .orElseThrow(() -> new NotFoundException("Événement introuvable"));

        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail.toLowerCase())
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        authorizeAdminAccess(actor, event);

        return feedbackRepository.findByEventIdOrderByCreatedAtDesc(eventId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateFeedbackCreation(Event event, User user, UUID eventId) {
        if (event.getStatus() != EventStatus.PUBLISHED && event.getStatus() != EventStatus.ARCHIVED && event.getStatus() != EventStatus.CANCELLED) {
            throw new BadRequestException("Le feedback n'est disponible qu'après un événement publié.");
        }

        Instant eventEnd = event.getStartAt().plusSeconds((long) event.getDurationMinutes() * 60);
        if (!Instant.now().isAfter(eventEnd)) {
            throw new BadRequestException("Le feedback n'est disponible qu'après la fin de l’événement.");
        }

        EventRegistration registration = registrationRepository.findByEventIdAndUserIdAndStatus(
                        eventId,
                        user.getId(),
                        RegistrationStatus.REGISTERED
                )
                .orElseThrow(() -> new BadRequestException("Seuls les participants inscrits peuvent laisser un feedback."));

        if (registration.getAttendanceStatus() != AttendanceStatus.PRESENT) {
            throw new BadRequestException("Seuls les participants présents peuvent laisser un feedback.");
        }
    }

    private void authorizeAdminAccess(User actor, Event event) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) return;

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new NotFoundException("Événement introuvable");
        }

        if (event.getAudience() != EventAudience.DEPARTMENT) {
            throw new NotFoundException("Événement introuvable");
        }

        Long actorDeptId = actor.getDepartment() != null ? actor.getDepartment().getId() : null;
        Long targetDeptId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId() : null;

        if (actorDeptId == null || targetDeptId == null || !actorDeptId.equals(targetDeptId)) {
            throw new NotFoundException("Événement introuvable");
        }
    }

    private String normalizeComment(String comment) {
        return comment != null && !comment.trim().isEmpty() ? comment.trim() : null;
    }

    private EventFeedbackResponse toResponse(EventFeedback feedback) {
        String firstName = feedback.getUser().getFirstName() != null ? feedback.getUser().getFirstName() : "";
        String lastName = feedback.getUser().getLastName() != null ? feedback.getUser().getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();

        return new EventFeedbackResponse(
                feedback.getId(),
                feedback.getEvent().getId(),
                feedback.getUser().getId(),
                fullName,
                feedback.getRating(),
                feedback.getComment(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt()
        );
    }
}