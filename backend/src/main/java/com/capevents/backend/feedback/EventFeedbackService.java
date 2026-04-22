package com.capevents.backend.feedback;

import com.capevents.backend.common.dto.PageResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventAudience;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.feedback.dto.*;
import com.capevents.backend.points.PointService;
import com.capevents.backend.registration.AttendanceStatus;
import com.capevents.backend.registration.EventRegistration;
import com.capevents.backend.registration.EventRegistrationRepository;
import com.capevents.backend.registration.RegistrationStatus;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class EventFeedbackService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final EventFeedbackRepository feedbackRepository;
    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final PointService pointService;

    public EventFeedbackService(
            EventFeedbackRepository feedbackRepository,
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            UserRepository userRepository, PointService pointService
    ) {
        this.feedbackRepository = feedbackRepository;
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
        this.pointService = pointService;
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

        String normalizedComment = normalizeComment(req.comment());
        feedback.setComment(normalizedComment);
        feedback.setShareCommentPublicly(
                Boolean.TRUE.equals(req.shareCommentPublicly()) && normalizedComment != null
        );

        EventFeedback saved = feedbackRepository.save(feedback);
        pointService.awardFeedbackBonus(user, event);

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


    @Transactional(readOnly = true)
    public PageResponse<PastEventCardResponse> listPastEvents(
            String category,
            Long departmentId,
            String audience,
            String q,
            org.springframework.data.domain.Pageable pageable
    ) {

        List<Event> allEvents = eventRepository.findAllPastVisibleEvents(Instant.now());

        String normalizedQuery = (q != null && !q.isBlank()) ? q.trim().toLowerCase() : null;

        List<Event> filtered = allEvents.stream()
                .filter(event -> category == null || category.isBlank() ||
                        (event.getCategory() != null && event.getCategory().equalsIgnoreCase(category.trim())))
                .filter(event -> departmentId == null ||
                        (event.getTargetDepartment() != null && departmentId.equals(event.getTargetDepartment().getId())))
                .filter(event -> audience == null || audience.isBlank() ||
                        (event.getAudience() != null && event.getAudience().name().equalsIgnoreCase(audience.trim())))
                .filter(event -> normalizedQuery == null ||
                        (event.getTitle() != null && event.getTitle().toLowerCase().contains(normalizedQuery)) ||
                        (event.getDescription() != null && event.getDescription().toLowerCase().contains(normalizedQuery)))
                .toList();

        int totalItems = filtered.size();
        int pageSize = pageable.getPageSize();
        int currentPage = pageable.getPageNumber();
        int totalPages = (int) Math.ceil((double) totalItems / pageSize);
        if (totalPages == 0) totalPages = 1;

        int fromIndex = Math.min(currentPage * pageSize, totalItems);
        int toIndex = Math.min(fromIndex + pageSize, totalItems);

        List<Event> pageEvents = filtered.subList(fromIndex, toIndex);

        List<PastEventCardResponse> pageItems = pageEvents.stream()
                .map(this::toPastEventCardResponse)
                .filter(Objects::nonNull)
                .toList();

        return new PageResponse<>(
                pageItems,
                currentPage,
                pageSize,
                totalPages,
                totalItems,
                currentPage + 1 < totalPages,
                currentPage > 0
        );
    }

    @Transactional(readOnly = true)
    public PastEventFeedbackDetailsResponse getPublicFeedbackDetails(UUID eventId) {
        Event event = eventRepository.findPastVisibleById(
                        eventId,
                        List.of(EventStatus.PUBLISHED, EventStatus.ARCHIVED),
                        Instant.now()
                )
                .orElseThrow(() -> new NotFoundException("Événement passé introuvable"));

        long feedbackCount = feedbackRepository.countByEventId(eventId);
        double averageRating = feedbackRepository.findAverageRatingByEventId(eventId) != null
                ? round2(feedbackRepository.findAverageRatingByEventId(eventId))
                : 0.0;

        long presentCount = registrationRepository.countByEventAndAttendanceStatus(
                event,
                AttendanceStatus.PRESENT
        );

        double feedbackResponseRate = presentCount > 0
                ? round2((feedbackCount * 100.0) / presentCount)
                : 0.0;

        List<EventFeedback> publicFeedbacks = feedbackRepository.findPublicCommentsByEventIdOrderByCreatedAtDesc(eventId);

        List<PublicFeedbackItemResponse> publicComments = publicFeedbacks.stream()
                .map(f -> new PublicFeedbackItemResponse(
                        f.getRating(),
                        f.getComment()
                ))
                .limit(6)
                .toList();

        List<String> highlights = buildHighlights(averageRating, feedbackCount, presentCount);
        List<String> improvementPoints = buildImprovementPoints(averageRating, publicFeedbacks);

        return new PastEventFeedbackDetailsResponse(
                event.getId(),
                event.getTitle(),
                event.getCategory(),
                event.getImageUrl(),
                event.getTargetDepartment() != null ? event.getTargetDepartment().getName() : "Global",
                event.getAudience().name(),
                event.getStartAt(),
                averageRating,
                feedbackCount,
                feedbackResponseRate,
                presentCount,
                highlights,
                improvementPoints,
                publicComments
        );
    }

    private PastEventCardResponse toPastEventCardResponse(Event event) {
        if (event == null) return null;

        UUID eventId = event.getId();
        long feedbackCount = 0;
        double averageRating = 0.0;
        long presentCount = 0;

        try {
            feedbackCount = feedbackRepository.countByEventId(eventId);
            Double avgRating = feedbackRepository.findAverageRatingByEventId(eventId);
            averageRating = avgRating != null ? round2(avgRating) : 0.0;
            presentCount = registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.PRESENT);
        } catch (Exception e) {
        }

        String teaser = averageRating >= 4.5
                ? "Très apprécié par les participants"
                : averageRating >= 4.0
                ? "Retours très positifs"
                : feedbackCount > 0
                ? "Découvrez ce qu’en ont pensé les participants"
                : "Événement passé";

        return new PastEventCardResponse(
                eventId,
                event.getTitle() != null ? event.getTitle() : "Sans titre",
                event.getCategory(),
                event.getImageUrl(),
                event.getTargetDepartment() != null ? event.getTargetDepartment().getName() : "Global",
                event.getAudience() != null ? event.getAudience().name() : "GLOBAL",
                event.getStartAt(),
                averageRating,
                feedbackCount,
                presentCount,
                teaser
        );
    }

    private List<String> buildHighlights(double averageRating, long feedbackCount, long presentCount) {
        List<String> items = new ArrayList<>();

        if (averageRating >= 4.5) {
            items.add("Très forte satisfaction globale des participants.");
        } else if (averageRating >= 4.0) {
            items.add("Satisfaction globale positive.");
        }

        if (feedbackCount >= 5) {
            items.add("Nombre d’avis suffisant pour refléter une expérience fiable.");
        }

        if (presentCount >= 10) {
            items.add("Bonne mobilisation des participants.");
        }

        if (items.isEmpty()) {
            items.add("Retour globalement utile pour découvrir cet événement.");
        }

        return items.stream().limit(3).toList();
    }

    private List<String> buildImprovementPoints(double averageRating, List<EventFeedback> publicFeedbacks) {
        List<String> items = new ArrayList<>();

        boolean hasLowRatedComment = publicFeedbacks.stream().anyMatch(f -> f.getRating() <= 3);

        if (averageRating < 4.0) {
            items.add("Quelques améliorations sont encore possibles sur le format ou l’organisation.");
        }

        if (hasLowRatedComment) {
            items.add("Certains participants ont signalé des points perfectibles.");
        }

        if (items.isEmpty()) {
            items.add("Aucun point d’amélioration majeur n’a été remonté publiquement.");
        }

        return items.stream().limit(3).toList();
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
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
                feedback.isShareCommentPublicly(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt()
        );
    }
}