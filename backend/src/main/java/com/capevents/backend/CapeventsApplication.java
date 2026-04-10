package com.capevents.backend;

import com.capevents.backend.config.AppMailProperties;
import com.capevents.backend.config.AppSecurityProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({AppSecurityProperties.class, AppMailProperties.class})
public class CapeventsApplication {
    public static void main(String[] args) {
        SpringApplication.run(CapeventsApplication.class, args);
    }
}
