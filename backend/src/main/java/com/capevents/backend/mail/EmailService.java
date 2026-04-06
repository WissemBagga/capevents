package com.capevents.backend.mail;

import com.capevents.backend.event.Event;

public interface EmailService {
    void sendVerificationEmail(String to, String rawToken);
    void sendResetPasswordEmail(String to, String rawToken);

    void sendEventInvitationEmail(String to, Event event, String inviterFullName);
    void sendRegistrationSavedEmail(String to, Event event);
    void sendEventCancelledEmail(String to, Event event);
    void sendEventRescheduledEmail(String to, Event event);
}