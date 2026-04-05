package com.capevents.backend.notification;

import com.capevents.backend.common.exception.NotFoundException;
import com.capevents.backend.notification.dto.NotificationResponse;
import com.capevents.backend.notification.dto.UnreadNotificationCountResponse;
import com.capevents.backend.user.User;
import com.capevents.backend.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService( NotificationRepository notificationRepository, UserRepository userRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
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

    @Transactional
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

    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(String userEmail, int limit) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

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
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        long unreadCount = notificationRepository.countByUserAndReadFalse(user);
        return new UnreadNotificationCountResponse(unreadCount);
    }

    @Transactional
    public void markAsRead(Long notificationId, String userEmail) {
        User user = userRepository.findByEmailWithRolesAndDepartment(userEmail)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

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
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

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
}