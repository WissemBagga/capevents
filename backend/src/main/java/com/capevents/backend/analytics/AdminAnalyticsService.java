package com.capevents.backend.analytics;

import com.capevents.backend.analytics.dto.AdminAnalyticsOverviewResponse;
import com.capevents.backend.analytics.dto.EventEngagementResponse;
import com.capevents.backend.analytics.dto.EventFeedbackAnalyticsResponse;
import com.capevents.backend.common.exception.BadRequestException;
import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.event.EventRepository;
import com.capevents.backend.event.EventStatus;
import com.capevents.backend.feedback.EventFeedbackRepository;
import com.capevents.backend.registration.AttendanceStatus;
import com.capevents.backend.registration.EventRegistrationRepository;
import com.capevents.backend.registration.RegistrationStatus;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class AdminAnalyticsService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final EventFeedbackRepository feedbackRepository;

    public AdminAnalyticsService(
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            UserRepository userRepository, EventFeedbackRepository feedbackRepository
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
        this.feedbackRepository = feedbackRepository;
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsOverviewResponse getOverview(String actorEmail) {
        User actor = userRepository.findByEmailWithRolesAndDepartment(actorEmail)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        List<Event> scopedEvents = resolveScopedEvents(actor);

        long totalEvents = scopedEvents.size();
        long publishedEvents = scopedEvents.stream()
                .filter(e -> e.getStatus() == EventStatus.PUBLISHED)
                .count();

        List<Event> eligibleEvents = scopedEvents.stream()
                .filter(this::isAnalyticsEligibleEvent)
                .toList();

        long totalRegistrations = 0L;
        long totalCapacity = 0L;
        long totalPresent = 0L;
        long totalAbsent = 0L;

        long totalFeedbacks = 0L;
        double ratingSum = 0.0;
        long ratedEventsCount = 0L;

        List<EventFeedbackAnalyticsResponse> topRatedEvents = eligibleEvents.stream()
                .map(event -> {
                    long feedbackCount = feedbackRepository.countByEventId(event.getId());
                    Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());

                    double averageRating = avg != null ? round2(avg) : 0.0;

                    return new EventFeedbackAnalyticsResponse(
                            event.getId(),
                            event.getTitle(),
                            event.getStatus().name(),
                            averageRating,
                            feedbackCount
                    );
                })
                .filter(item -> item.feedbackCount() > 0)
                .sorted(
                        Comparator.comparing(EventFeedbackAnalyticsResponse::averageRating).reversed()
                                .thenComparing(EventFeedbackAnalyticsResponse::feedbackCount).reversed()
                )
                .limit(5)
                .toList();

        List<EventEngagementResponse> topEngagingEvents = eligibleEvents.stream()
                .map(event -> {
                    long registeredCount = registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
                    long presentCount = registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.PRESENT);
                    long absentCount = registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.ABSENT);

                    double attendanceRate = registeredCount > 0
                            ? round2((presentCount * 100.0) / registeredCount)
                            : 0.0;

                    return new EventEngagementResponse(
                            event.getId(),
                            event.getTitle(),
                            event.getStatus().name(),
                            registeredCount,
                            event.getCapacity() != null ? event.getCapacity().longValue() : 0L,
                            presentCount,
                            absentCount,
                            attendanceRate
                    );
                })
                .sorted(Comparator
                        .comparing(EventEngagementResponse::registeredCount).reversed()
                        .thenComparing(EventEngagementResponse::presentCount).reversed()
                )
                .limit(5)
                .toList();

        for (Event event : eligibleEvents) {
            totalRegistrations += registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);
            totalPresent += registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.PRESENT);
            totalAbsent += registrationRepository.countByEventAndAttendanceStatus(event, AttendanceStatus.ABSENT);
            totalCapacity += event.getCapacity() != null ? event.getCapacity() : 0;

            long feedbackCount = feedbackRepository.countByEventId(event.getId());
            Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());

            totalFeedbacks += feedbackCount;

            if (avg != null && feedbackCount > 0) {
                ratingSum += avg;
                ratedEventsCount++;
            }
        }

        double registrationRate = totalCapacity > 0
                ? round2((totalRegistrations * 100.0) / totalCapacity)
                : 0.0;

        double attendanceRate = totalRegistrations > 0
                ? round2((totalPresent * 100.0) / totalRegistrations)
                : 0.0;

        double averageRating = totalFeedbacks > 0
                ? round2(
                eligibleEvents.stream()
                        .mapToDouble(event -> {
                            Double avg = feedbackRepository.findAverageRatingByEventId(event.getId());
                            long count = feedbackRepository.countByEventId(event.getId());
                            return (avg != null ? avg : 0.0) * count;
                        })
                        .sum() / totalFeedbacks
        )
                : 0.0;

        double feedbackResponseRate = totalPresent > 0
                ? round2((totalFeedbacks * 100.0) / totalPresent)
                : 0.0;

        return new AdminAnalyticsOverviewResponse(
                totalEvents,
                publishedEvents,
                totalRegistrations,
                totalCapacity,
                registrationRate,
                totalPresent,
                totalAbsent,
                attendanceRate,
                totalFeedbacks,
                averageRating,
                feedbackResponseRate,
                topRatedEvents,
                topEngagingEvents
        );
    }

    private List<Event> resolveScopedEvents(User actor) {
        boolean isHr = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_HR"));
        if (isHr) {
            return eventRepository.findAllForAnalytics();
        }

        boolean isManager = actor.getRoles().stream().anyMatch(r -> r.getCode().equals("ROLE_MANAGER"));
        if (!isManager) {
            throw new BadRequestException("Action non autorisée");
        }

        if (actor.getDepartment() == null) {
            throw new BadRequestException("Le manager n’a pas de département");
        }

        return eventRepository.findAllForAnalyticsByCreatorDepartment(actor.getDepartment().getId());
    }

    private boolean isAnalyticsEligibleEvent(Event event) {
        return event.getStatus() == EventStatus.PUBLISHED
                || event.getStatus() == EventStatus.CANCELLED
                || event.getStatus() == EventStatus.ARCHIVED;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}