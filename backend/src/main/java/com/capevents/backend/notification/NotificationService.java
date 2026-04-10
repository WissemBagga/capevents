package com.capevents.backend.notification;

import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.event.Event;
import com.capevents.backend.notification.dto.NotificationResponse;
import com.capevents.backend.notification.dto.UnreadNotificationCountResponse;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class NotificationService {

    private static final String USER_NOT_FOUND_MESSAGE = "Utilisateur introuvable";
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public void createNotification( User user, NotificationType type, String title, String message, String actionPath) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionPath(actionPath);
        notification.setRead(false);
        notification.setReadAt(null);
        notification.setCreatedAt(Instant.now());

        notificationRepository.save(notification);
    }

    public void createNotifications(List<User> users, NotificationType type, String title, String message, String actionPath) {
        List<Notification> notifications = users.stream().map(user -> {
            Notification notification = new Notification();
            notification.setUser(user);
            notification.setType(type);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setActionPath(actionPath);
            notification.setRead(false);
            notification.setReadAt(null);
            notification.setCreatedAt(Instant.now());
            return notification;
        }).toList();

        notificationRepository.saveAll(notifications);
    }

    @Transactional
    public void notifyInvitationReceived(User target, Event event, String inviterFullName) {
        String title = "Nouvelle invitation";


        String message = inviterFullName != null && !inviterFullName.isBlank()
                ? "Vous avez reçu une invitation de " + inviterFullName + " pour l’événement \"" + event.getTitle() + "\"."
                : "Vous avez reçu une invitation pour l’événement \"" + event.getTitle() + "\".";
        createNotification(target, NotificationType.EVENT_INVITATION_RECEIVED,
                title, message, "/my-invitations");
    }

    @Transactional
    public void notifyRegistrationSaved(User user, Event event) {
        createNotification(
                user,
                NotificationType.EVENT_REGISTRATION_CONFIRMED,
                "Inscription enregistrée",
                "Vous êtes inscrit à l’événement \"" + event.getTitle() + "\".",
                "/my-events"
        );
    }

    @Transactional
    public void notifyEventCancelled(List<User> users, Event event) {
        if (users == null || users.isEmpty()) return;

        String title = "L’événement \"" + event.getTitle() + "\" a été annulé.";
        String message = event.getCancelReason() != null && !event.getCancelReason().isBlank()
                ? title + " Raison : " + event.getCancelReason()
                : title ;

        createNotifications(users,NotificationType.EVENT_CANCELLED,
                "Événement annulé",message,null);
    }

    @Transactional
    public void notifyEventRescheduled(List<User> users, Event event) {
        if (users == null || users.isEmpty()) return;

        String formattedDate = event.getStartAt() != null
                ? DATE_TIME_FORMATTER.format(event.getStartAt())
                : null;

        String title = "L’événement \"" + event.getTitle() + "\" a été reprogrammé";
        String message = formattedDate != null
                ? title + " au " + formattedDate + "."
                : title + ".";

        createNotifications(
                users, NotificationType.EVENT_RESCHEDULED,"Événement reprogrammé",
                message, "/events/" + event.getId());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(String userEmail, int limit) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        int safeLimit = Math.min(Math.max(limit, 1), 50);

        return notificationRepository
                .findByUserOrderByCreatedAtDesc(user, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UnreadNotificationCountResponse getUnreadCount(String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        long unreadCount = notificationRepository.countByUserAndReadFalse(user);
        return new UnreadNotificationCountResponse(unreadCount);
    }

    @Transactional
    public void markAsRead(Long notificationId, String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        Notification notification = notificationRepository.findByIdAndUser(notificationId, user)
                .orElseThrow(() -> new NotFoundException("Notification introuvable"));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }
    }

    @Transactional
    public void markAllAsRead(String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail)
                .orElseThrow(() -> new NotFoundException(USER_NOT_FOUND_MESSAGE));

        List<Notification> unreadNotifications = notificationRepository.findByUserAndReadFalseOrderByCreatedAtDesc(user);

        Instant now = Instant.now();

        for (Notification notification : unreadNotifications) {
            notification.setRead(true);
            notification.setReadAt(now);
        }

        notificationRepository.saveAll(unreadNotifications);
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType().name(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getActionPath(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }

    @Transactional
    public void notifyEventProposalSubmitted(List<User> approvers, Event event, User creator) {
        if (approvers == null || approvers.isEmpty()) return;

        String creatorFullName = buildFullName(creator.getFirstName(), creator.getLastName());

        String audienceLabel = event.getAudience() != null ? event.getAudience().name() : "UNKNOWN";

        String message = creatorFullName
                + " a soumis une demande d’événement \"" + event.getTitle() + "\"."
                + " Audience : " + audienceLabel + ".";

        createNotifications(
                approvers,
                NotificationType.EVENT_PROPOSAL_SUBMITTED,
                "Nouvelle demande d’événement",
                message,
                "/admin/events/" + event.getId()
        );
    }

    @Transactional
    public void notifyEventProposalApproved(User creator, Event event) {
        createNotification(
                creator,
                NotificationType.EVENT_PROPOSAL_APPROVED,
                "Demande approuvée",
                "Votre événement \"" + event.getTitle() + "\" a été approuvé et publié.",
                "/events/" + event.getId()
        );
    }

    @Transactional
    public void notifyEventProposalRejected(User creator, Event event, String reason) {
        String safeReason = (reason != null && !reason.isBlank())
                ? reason.trim()
                : "Aucune raison précisée.";

        createNotification(
                creator,
                NotificationType.EVENT_PROPOSAL_REJECTED,
                "Demande refusée",
                "Votre événement \"" + event.getTitle() + "\" a été refusé. Raison : " + safeReason,
                null
        );
    }

    private String buildFullName(String firstName, String lastName) {
        String safeFirstName = firstName != null ? firstName.trim() : "";
        String safeLastName = lastName != null ? lastName.trim() : "";
        return (safeFirstName + " " + safeLastName).trim();
    }

    @Transactional
    public void notifyEventPublished(List<User> users, Event event) {
        if (users == null || users.isEmpty()) return;

        createNotifications(
                dedupeUsers(users),
                NotificationType.EVENT_PUBLISHED,
                "Nouvel événement publié",
                "Un nouvel événement \"" + event.getTitle() + "\" a été publié.",
                "/events/" + event.getId()
        );
    }

    @Transactional
    public void notifyProposalPendingForCreator(User creator, Event event) {
        createNotification(
                creator,
                NotificationType.EVENT_PROPOSAL_PENDING_FOR_CREATOR,
                "Proposition en attente",
                "Votre événement \"" + event.getTitle() + "\" est en attente de validation.",
                "/my-submissions"
        );
    }

    @Transactional
    public void notifyEventReminder24h(List<User> users, Event event) {
        if (users == null || users.isEmpty()) return;

        String when = event.getStartAt() != null ? DATE_TIME_FORMATTER.format(event.getStartAt()) : "";
        createNotifications(
                dedupeUsers(users),
                NotificationType.EVENT_REMINDER_24H,
                "Rappel événement",
                "Rappel : l’événement \"" + event.getTitle() + "\" commence dans moins de 24h"
                        + (when.isBlank() ? "." : " (" + when + ")."),
                "/events/" + event.getId()
        );
    }

    @Transactional
    public void notifyRegistrationDeadlineReminder(List<User> users, Event event) {
        if (users == null || users.isEmpty()) return;

        String deadline = event.getRegistrationDeadline() != null
                ? DATE_TIME_FORMATTER.format(event.getRegistrationDeadline())
                : "";

        createNotifications(
                dedupeUsers(users),
                NotificationType.REGISTRATION_DEADLINE_REMINDER,
                "Rappel date limite",
                "La date limite d’inscription pour \"" + event.getTitle() + "\" approche"
                        + (deadline.isBlank() ? "." : " (" + deadline + ")."),
                "/events/" + event.getId()
        );
    }

    @Transactional
    public void notifyFeedbackAvailable(List<User> users, Event event) {
        if (users == null || users.isEmpty()) return;

        createNotifications(
                dedupeUsers(users),
                NotificationType.EVENT_FEEDBACK_AVAILABLE,
                "Donnez votre avis",
                "Donnez votre avis sur \"" + event.getTitle() + "\".",
                "/events/" + event.getId() + "/feedback"
        );
    }

    private List<User> dedupeUsers(List<User> users) {
        return users.stream()
                .filter(user -> user != null && user.getId() != null)
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toMap(User::getId, user -> user, (a, b) -> a),
                        map -> new java.util.ArrayList<>(map.values())
                ));
    }



}