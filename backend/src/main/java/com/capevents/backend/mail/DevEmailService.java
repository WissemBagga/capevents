package com.capevents.backend.mail;

import com.capevents.backend.config.AppMailProperties;
import com.capevents.backend.event.Event;
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
}