package com.capevents.backend.service.mail;

import com.capevents.backend.config.AppMailProperties;
import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.User;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("dev")
public class DevEmailService implements EmailService {

    private final AppMailProperties mailProperties;

    public DevEmailService(AppMailProperties mailProperties) {
        this.mailProperties = mailProperties;
    }

    @Override
    public void sendVerificationEmail(String to, String rawToken) {
        System.out.println("[DEV EMAIL] Verify account for " + to + ": "
                + mailProperties.getFrontendBaseUrl() + "/verify-email?token=" + rawToken);
    }

    @Override
    public void sendResetPasswordEmail(String to, String rawToken) {
        System.out.println("[DEV EMAIL] Reset password for " + to + ": "
                + mailProperties.getFrontendBaseUrl() + "/reset-password?token=" + rawToken);
    }

    @Override
    public void sendEventInvitationEmail(String to, Event event, String inviterFullName) {
        System.out.println("[DEV EMAIL] Event invitation for " + to
                + " | event=" + event.getTitle()
                + " | inviter=" + inviterFullName
                + " | link=" + mailProperties.getFrontendBaseUrl() + "/events/" + event.getId());
    }

    @Override
    public void sendRegistrationSavedEmail(String to, Event event) {
        System.out.println("[DEV EMAIL] Registration saved for " + to
                + " | event=" + event.getTitle()
                + " | link=" + mailProperties.getFrontendBaseUrl() + "/my-events");
    }

    @Override
    public void sendEventCancelledEmail(String to, Event event) {
        System.out.println("[DEV EMAIL] Event cancelled for " + to
                + " | event=" + event.getTitle());
    }

    @Override
    public void sendEventRescheduledEmail(String to, Event event) {
        System.out.println("[DEV EMAIL] Event rescheduled for " + to
                + " | event=" + event.getTitle()
                + " | link=" + mailProperties.getFrontendBaseUrl() + "/events/" + event.getId());
    }

    @Override
    public void sendEventProposalSubmittedEmail(String to, Event event, User creator) {
        String creatorFullName = buildFullName(creator.getFirstName(), creator.getLastName());

        System.out.println("[DEV EMAIL] Event proposal submitted to " + to
                + " | creator=" + creatorFullName
                + " | event=" + event.getTitle()
                + " | link=" + mailProperties.getFrontendBaseUrl() + "/admin/events/" + event.getId());
    }

    @Override
    public void sendEventProposalApprovedEmail(String to, Event event) {
        System.out.println("[DEV EMAIL] Event proposal approved for " + to
                + " | event=" + event.getTitle()
                + " | link=" + mailProperties.getFrontendBaseUrl() + "/events/" + event.getId());
    }

    @Override
    public void sendEventProposalRejectedEmail(String to, Event event, String reason) {
        System.out.println("[DEV EMAIL] Event proposal rejected for " + to
                + " | event=" + event.getTitle()
                + " | reason=" + reason);
    }

    private String buildFullName(String firstName, String lastName) {
        String safeFirstName = firstName != null ? firstName.trim() : "";
        String safeLastName = lastName != null ? lastName.trim() : "";
        return (safeFirstName + " " + safeLastName).trim();
    }


    @Override
    public void sendEventProposalPendingEmail(String to, Event event) {
        System.out.println("[DEV EMAIL] Event proposal pending for " + to
                + " | event=" + event.getTitle()
                + " | link=" + mailProperties.getFrontendBaseUrl() + "/my-submissions");
    }

    @Override
    public void sendRoleChangedEmail(String to, String fullName, String roleLabel) {
        System.out.println("[DEV EMAIL] Role changed for " + to
                + " | user=" + fullName
                + " | newRole=" + roleLabel
                + " | message=Votre rôle a été mis à jour. Il sera pris en compte à la prochaine connexion.");
    }
}