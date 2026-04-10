package com.capevents.backend.mail;

import com.capevents.backend.config.AppMailProperties;
import com.capevents.backend.event.Event;
import com.capevents.backend.user.User;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@Profile("mailtrap")
public class MailtrapEmailService implements EmailService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                    .withZone(ZoneId.systemDefault());

    private final JavaMailSender mailSender;
    private final AppMailProperties mailProperties;

    public MailtrapEmailService(JavaMailSender mailSender, AppMailProperties mailProperties) {
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
    }

    @Override
    public void sendVerificationEmail(String to, String rawToken) {
        String verifyUrl = mailProperties.getFrontendBaseUrl() + "/verify-email?token=" + rawToken;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Vérification de votre compte CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "Veuillez vérifier votre compte en cliquant sur ce lien :\n" +
                        verifyUrl + "\n\n" +
                        "Ce lien expire dans 24 heures.\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendResetPasswordEmail(String to, String rawToken) {
        String resetUrl = mailProperties.getFrontendBaseUrl() + "/reset-password?token=" + rawToken;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Réinitialisation de votre mot de passe CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "Cliquez sur ce lien pour réinitialiser votre mot de passe :\n" +
                        resetUrl + "\n\n" +
                        "Ce lien expire dans 15 minutes.\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendEventInvitationEmail(String to, Event event, String inviterFullName) {
        String eventUrl = mailProperties.getFrontendBaseUrl() + "/events/" + event.getId();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Invitation à un événement CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        (inviterFullName != null && !inviterFullName.isBlank()
                                ? inviterFullName + " vous a invité à l’événement suivant :\n\n"
                                : "Vous avez reçu une invitation pour l’événement suivant :\n\n") +
                        "Titre : " + event.getTitle() + "\n" +
                        "Date : " + DATE_TIME_FORMATTER.format(event.getStartAt()) + "\n" +
                        "Lien : " + eventUrl + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendRegistrationSavedEmail(String to, Event event) {
        String myEventsUrl = mailProperties.getFrontendBaseUrl() + "/my-events";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Inscription enregistrée - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "Votre inscription à l’événement \"" + event.getTitle() + "\" a bien été enregistrée.\n\n" +
                        "Consulter mes événements : " + myEventsUrl + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendEventCancelledEmail(String to, Event event) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Événement annulé - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "L’événement \"" + event.getTitle() + "\" a été annulé.\n" +
                        (event.getCancelReason() != null && !event.getCancelReason().isBlank()
                                ? "Raison : " + event.getCancelReason() + "\n\n"
                                : "\n") +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendEventRescheduledEmail(String to, Event event) {
        String eventUrl = mailProperties.getFrontendBaseUrl() + "/events/" + event.getId();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Événement reprogrammé - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "L’événement \"" + event.getTitle() + "\" a été reprogrammé.\n" +
                        "Nouvelle date : " + DATE_TIME_FORMATTER.format(event.getStartAt()) + "\n" +
                        "Lien : " + eventUrl + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendEventProposalSubmittedEmail(String to, Event event, User creator) {
        String eventUrl = mailProperties.getFrontendBaseUrl() + "/admin/events/" + event.getId();
        String creatorFullName = buildFullName(creator.getFirstName(), creator.getLastName());

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Nouvelle demande d’événement - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        creatorFullName + " a soumis une demande d’événement.\n\n" +
                        "Titre : " + event.getTitle() + "\n" +
                        "Date : " + DATE_TIME_FORMATTER.format(event.getStartAt()) + "\n" +
                        "Audience : " + event.getAudience() + "\n" +
                        "Voir la demande : " + eventUrl + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendEventProposalApprovedEmail(String to, Event event) {
        String eventUrl = mailProperties.getFrontendBaseUrl() + "/events/" + event.getId();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Demande approuvée - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "Votre événement \"" + event.getTitle() + "\" a été approuvé et publié.\n" +
                        "Voir l’événement : " + eventUrl + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    @Override
    public void sendEventProposalRejectedEmail(String to, Event event, String reason) {
        String safeReason = (reason != null && !reason.isBlank())
                ? reason.trim()
                : "Aucune raison précisée.";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Demande refusée - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "Votre événement \"" + event.getTitle() + "\" a été refusé.\n" +
                        "Raison : " + safeReason + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

    private String buildFullName(String firstName, String lastName) {
        String safeFirstName = firstName != null ? firstName.trim() : "";
        String safeLastName = lastName != null ? lastName.trim() : "";
        return (safeFirstName + " " + safeLastName).trim();
    }

    @Override
    public void sendEventProposalPendingEmail(String to, Event event) {
        String submissionsUrl = mailProperties.getFrontendBaseUrl() + "/my-submissions";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.getFrom());
        message.setTo(to);
        message.setSubject("Demande en attente de validation - CapEvents");
        message.setText(
                "Bonjour,\n\n" +
                        "Votre événement \"" + event.getTitle() + "\" a bien été envoyé pour validation.\n" +
                        "Vous serez notifié dès qu’une décision sera prise.\n\n" +
                        "Voir mes demandes : " + submissionsUrl + "\n\n" +
                        "CapEvents"
        );

        mailSender.send(message);
    }

}