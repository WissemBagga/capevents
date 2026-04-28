package com.capevents.backend.service;

import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.enums.EventAudience;
import com.capevents.backend.repository.EventRepository;
import com.capevents.backend.entity.enums.EventStatus;
import com.capevents.backend.entity.enums.AttendanceStatus;
import com.capevents.backend.entity.EventRegistration;
import com.capevents.backend.repository.EventRegistrationRepository;
import com.capevents.backend.entity.enums.RegistrationStatus;
import com.capevents.backend.entity.User;
import com.capevents.backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EventNotificationSchedulerService {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public EventNotificationSchedulerService(
            EventRepository eventRepository,
            EventRegistrationRepository registrationRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void send24hEventReminders() {
        Instant now = Instant.now();
        Instant from = now.plus(Duration.ofHours(23)).minus(Duration.ofMinutes(30));
        Instant to = now.plus(Duration.ofHours(24)).plus(Duration.ofMinutes(30));

        List<Event> events = eventRepository.findByStatusAndStartAtBetweenAndReminder24hSentAtIsNull(
                EventStatus.PUBLISHED, from, to
        );

        for (Event event : events) {
            List<User> users = getRegisteredUsers(event);
            notificationService.notifyEventReminder24h(users, event);
            event.setReminder24hSentAt(now);
        }
    }

    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void send48hDeadlineReminders() {
        Instant now = Instant.now();
        Instant from = now.plus(Duration.ofHours(47)).minus(Duration.ofMinutes(30));
        Instant to = now.plus(Duration.ofHours(48)).plus(Duration.ofMinutes(30));

        List<Event> events = eventRepository.findByStatusAndRegistrationDeadlineBetweenAndDeadlineReminder48hSentAtIsNull(
                EventStatus.PUBLISHED, from, to
        );

        for (Event event : events) {
            List<User> users = resolveVisibleNonRegisteredUsers(event);
            notificationService.notifyRegistrationDeadlineReminder(users, event);
            event.setDeadlineReminder48hSentAt(now);
        }
    }

    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void sendFeedbackAvailableNotifications() {
        Instant now = Instant.now();

        List<Event> events = eventRepository.findByStatusAndFeedbackNotificationSentAtIsNullOrderByCreatedAtDesc(
                EventStatus.PUBLISHED
        );

        for (Event event : events) {
            Instant eventEnd = event.getStartAt().plus(Duration.ofMinutes(event.getDurationMinutes()));
            Instant feedbackMoment = eventEnd.plus(Duration.ofHours(24));

            if (now.isBefore(feedbackMoment)) {
                continue;
            }

            List<User> presentUsers = registrationRepository
                    .findByEventAndStatusAndAttendanceStatusOrderByRegisteredAtAsc(
                            event,
                            RegistrationStatus.REGISTERED,
                            AttendanceStatus.PRESENT
                    )
                    .stream()
                    .map(EventRegistration::getUser)
                    .toList();

            notificationService.notifyFeedbackAvailable(presentUsers, event);
            event.setFeedbackNotificationSentAt(now);
        }
    }

    private List<User> getRegisteredUsers(Event event) {
        return registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(
                        event,
                        RegistrationStatus.REGISTERED
                )
                .stream()
                .map(EventRegistration::getUser)
                .toList();
    }

    private List<User> resolveVisibleNonRegisteredUsers(Event event) {
        List<User> visibleUsers;

        if (event.getAudience() == EventAudience.GLOBAL) {
            visibleUsers = userRepository.findActiveVerifiedEmployeeUsers();
        } else {
            Long departmentId = event.getTargetDepartment() != null ? event.getTargetDepartment().getId() : null;
            if (departmentId == null) {
                return List.of();
            }
            visibleUsers = userRepository.findActiveVerifiedEmployeeUsersByDepartmentId(departmentId);
        }

        Set<UUID> registeredIds = registrationRepository.findByEventAndStatusOrderByRegisteredAtAsc(
                        event,
                        RegistrationStatus.REGISTERED
                )
                .stream()
                .map(reg -> reg.getUser().getId())
                .collect(Collectors.toSet());

        UUID creatorId = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;

        return visibleUsers.stream()
                .filter(user -> !registeredIds.contains(user.getId()))
                .filter(user -> creatorId == null || !creatorId.equals(user.getId()))
                .toList();
    }
}