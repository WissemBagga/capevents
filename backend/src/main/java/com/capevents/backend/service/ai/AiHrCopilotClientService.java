package com.capevents.backend.service.ai;

import com.capevents.backend.config.AiServiceProperties;

import java.net.URI;

import com.capevents.backend.dto.ai.AiHrCopilotResponseDto;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class AiHrCopilotClientService {

    private final RestTemplate aiRestTemplate;
    private final AiServiceProperties aiServiceProperties;

    public AiHrCopilotClientService(
            RestTemplate aiRestTemplate,
            AiServiceProperties aiServiceProperties
    ) {
        this.aiRestTemplate = aiRestTemplate;
        this.aiServiceProperties = aiServiceProperties;
    }

    public AiHrCopilotResponseDto getSuggestions() {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/hr-copilot/suggestions")
                .build()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-ai-service-key", aiServiceProperties.getServiceKey());

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<AiHrCopilotResponseDto> response =
                    aiRestTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            request,
                            AiHrCopilotResponseDto.class
                    );

            return response.getBody();

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le service IA du copilote RH est indisponible.",
                    exception
            );
        }
    }
}