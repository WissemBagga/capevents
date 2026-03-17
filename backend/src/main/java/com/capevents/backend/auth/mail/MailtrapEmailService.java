package com.capevents.backend.auth.mail;

import com.capevents.backend.config.AppMailProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Profile("mailtrap")
public class MailtrapEmailService implements EmailService {

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
}