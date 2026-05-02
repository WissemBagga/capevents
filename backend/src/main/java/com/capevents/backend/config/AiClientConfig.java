package com.capevents.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(AiServiceProperties.class)
public class AiClientConfig {

    @Bean
    public RestTemplate aiRestTemplate(
            RestTemplateBuilder builder,
            AiServiceProperties aiServiceProperties
    ) {
        Duration timeout = Duration.ofSeconds(aiServiceProperties.getTimeoutSeconds());

        return builder
                .connectTimeout(timeout)
                .readTimeout(timeout)
                .build();
    }
}