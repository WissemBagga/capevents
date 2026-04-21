package com.capevents.backend.mail;

import com.capevents.backend.event.Event;
import com.capevents.backend.user.User;

public interface EmailService {
    void sendVerificationEmail(String to, String rawToken);
    void sendResetPasswordEmail(String to, String rawToken);

    void sendEventInvitationEmail(String to, Event event, String inviterFullName);
    void sendRegistrationSavedEmail(String to, Event event);
    void sendEventCancelledEmail(String to, Event event);
    void sendEventRescheduledEmail(String to, Event event);


    void sendEventProposalPendingEmail(String to, Event event);

    void sendEventProposalSubmittedEmail(String to, Event event, User creator);
    void sendEventProposalApprovedEmail(String to, Event event);
    void sendEventProposalRejectedEmail(String to, Event event, String reason);

    void sendRoleChangedEmail(String to, String fullName, String roleLabel);
}