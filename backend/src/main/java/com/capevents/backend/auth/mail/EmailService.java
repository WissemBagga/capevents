package com.capevents.backend.auth.mail;

public interface EmailService {
    void sendVerificationEmail(String to, String rawToken);
    void sendResetPasswordEmail(String to, String rawToken);
}