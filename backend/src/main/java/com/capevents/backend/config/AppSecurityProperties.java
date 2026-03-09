package com.capevents.backend.config;


import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
@ConfigurationProperties(prefix = "app.security")

public class AppSecurityProperties {

    private List<String> allowedEmailDomains = new ArrayList<>();

}