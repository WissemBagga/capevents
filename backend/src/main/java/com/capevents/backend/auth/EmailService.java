package com.capevents.backend.auth;

public interface EmailService {
    void sendVerificationEmail(String to, String rawToken);
    void sendResetPasswordEmail(String to, String rawToken);
}