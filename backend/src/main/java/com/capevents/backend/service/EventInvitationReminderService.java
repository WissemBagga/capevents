package com.capevents.backend.service;


import com.capevents.backend.dto.InvitationReminderResponse;
import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.EventInvitation;
import com.capevents.backend.entity.EventInvitationReminder;
import com.capevents.backend.entity.User;
import com.capevents.backend.entity.enums.ReminderChannel;
import com.capevents.backend.entity.enums.ReminderStatus;
import com.capevents.backend.repository.EventInvitationReminderRepository;
import com.capevents.backend.repository.EventInvitationRepository;
import com.capevents.backend.repository.EventRepository;
import com.capevents.backend.repository.UserRepository;
import com.capevents.backend.service.mail.EmailService;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EventInvitationReminderService {

    private static final int REMINDER_COOLDOWN_HOURS = 24;

    private final EventRepository eventRepository;
    private final EventInvitationRepository eventInvitationRepository;
    private final EventInvitationReminderRepository reminderRepository;
    private final UserRepository userRepository;
    private final EmailService invitationReminderMailService;
    private final NotificationService notificationService;

    public EventInvitationReminderService(
            EventRepository eventRepository,
            EventInvitationRepository eventInvitationRepository,
            EventInvitationReminderRepository reminderRepository,
            UserRepository userRepository,
            EmailService invitationReminderMailService, NotificationService notificationService
    ) {
        this.eventRepository = eventRepository;
        this.eventInvitationRepository = eventInvitationRepository;
        this.reminderRepository = reminderRepository;
        this.userRepository = userRepository;
        this.invitationReminderMailService = invitationReminderMailService;
        this.notificationService = notificationService;
    }

    @Transactional
    public InvitationReminderResponse sendPendingInvitationReminders(
            UUID eventId,
            String currentUserEmail,
            String customMessage
    ) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Événement introuvable."
                ));

        User sentBy = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Utilisateur connecté introuvable."
                ));

        OffsetDateTime cooldownAfter = OffsetDateTime.now().minusHours(REMINDER_COOLDOWN_HOURS);

        List<EventInvitation> invitations =
                eventInvitationRepository.findPendingInvitationsEligibleForReminder(
                        eventId,
                        cooldownAfter
                );

        int sent = 0;
        int failed = 0;

        for (EventInvitation invitation : invitations) {
            String subject = "Rappel d’invitation - " + event.getTitle();
            String message = buildReminderMessage(invitation, event, customMessage);

            EventInvitationReminder reminder = new EventInvitationReminder();
            reminder.setInvitation(invitation);
            reminder.setSentBy(sentBy);
            reminder.setChannel(ReminderChannel.EMAIL);
            reminder.setSubject(subject);
            reminder.setMessage(message);
            reminder.setSentAt(OffsetDateTime.now());

            try {
                // 1. Notification interne CapEvents, toujours envoyée.
                notificationService.notifyInvitationReminder(
                        invitation.getUser(),
                        event
                );

                // 2. Email de relance, selon le profil actif : dev = console, mailtrap = email réel.
                try {
                    invitationReminderMailService.sendInvitationReminder(
                            invitation.getUser(),
                            event,
                            message
                    );

                    reminder.setChannel(ReminderChannel.EMAIL);
                    reminder.setStatus(ReminderStatus.SENT);

                } catch (Exception emailException) {
                    // La notification interne est déjà envoyée.
                    // On garde une trace que l’email a échoué, mais on bloque le spam grâce au statut SENT.
                    reminder.setChannel(ReminderChannel.SYSTEM);
                    reminder.setStatus(ReminderStatus.SENT);
                    reminder.setErrorMessage("Email failed: " + emailException.getMessage());
                    failed++;
                }

                sent++;

            } catch (Exception exception) {
                reminder.setChannel(ReminderChannel.SYSTEM);
                reminder.setStatus(ReminderStatus.FAILED);
                reminder.setErrorMessage(exception.getMessage());
                failed++;
            }

            reminderRepository.save(reminder);
        }

        String responseMessage;

        if (invitations.isEmpty()) {
            responseMessage = "Aucune invitation éligible à relancer. Les collaborateurs ont peut-être déjà répondu ou ont été relancés récemment.";
        } else {
            responseMessage = sent + " relance(s) envoyée(s) dans CapEvents, "
                    + failed + " email(s) en échec.";
        }

        return new InvitationReminderResponse(
                event.getId(),
                event.getTitle(),
                invitations.size(),
                sent,
                failed,
                responseMessage
        );
    }

    private String buildReminderMessage(
            EventInvitation invitation,
            Event event,
            String customMessage
    ) {
        String firstName = invitation.getUser().getFirstName();

        if (customMessage != null && !customMessage.isBlank()) {
            return """
                Bonjour %s,

                %s

                Merci de confirmer votre réponse dès que possible depuis la plateforme CapEvents.

                Cordialement,
                L’équipe CapEvents
                """.formatted(firstName, customMessage.trim());
        }

        return """
            Bonjour %s,

            Nous vous rappelons que vous avez une invitation en attente pour l’événement « %s ».

            Votre réponse nous aide à mieux organiser la participation et la logistique de l’événement.

            Merci de confirmer votre réponse dès que possible depuis la plateforme CapEvents.

            Cordialement,
            L’équipe CapEvents
            """.formatted(firstName, event.getTitle());
    }
}