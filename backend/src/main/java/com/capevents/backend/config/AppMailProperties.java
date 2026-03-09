package com.capevents.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Setter
@Getter
@ConfigurationProperties(prefix = "app.mail")
public class AppMailProperties {

    private String from;
    private String frontendBaseUrl;

}