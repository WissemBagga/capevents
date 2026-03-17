package com.capevents.backend.auth.mail;

import com.capevents.backend.config.AppMailProperties;
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
}