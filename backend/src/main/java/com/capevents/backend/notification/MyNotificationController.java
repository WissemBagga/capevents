package com.capevents.backend.notification;

import com.capevents.backend.notification.dto.NotificationResponse;
import com.capevents.backend.notification.dto.UnreadNotificationCountResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me/notifications")
public class MyNotificationController {

    private final NotificationService notificationService;

    public MyNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public List<NotificationResponse> getMyNotifications( @RequestParam(defaultValue = "10") int limit, Authentication auth ) {
        return notificationService.getMyNotifications(auth.getName(), limit);
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/unread-count")
    public UnreadNotificationCountResponse getUnreadCount(Authentication auth) {
        return notificationService.getUnreadCount(auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id, Authentication auth) {
        notificationService.markAsRead(id, auth.getName());
    }

    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/read-all")
    public void markAllAsRead(Authentication auth) {
        notificationService.markAllAsRead(auth.getName());
    }
}