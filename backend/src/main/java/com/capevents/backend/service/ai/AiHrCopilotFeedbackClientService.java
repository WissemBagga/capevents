package com.capevents.backend.service.ai;

import com.capevents.backend.config.AiServiceProperties;
import com.capevents.backend.dto.ai.AiHrCopilotFeedbackRequestDto;
import com.capevents.backend.dto.ai.AiHrCopilotFeedbackResponseDto;

import java.net.URI;

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
public class AiHrCopilotFeedbackClientService {

    private final RestTemplate aiRestTemplate;
    private final AiServiceProperties aiServiceProperties;

    public AiHrCopilotFeedbackClientService(
            RestTemplate aiRestTemplate,
            AiServiceProperties aiServiceProperties
    ) {
        this.aiRestTemplate = aiRestTemplate;
        this.aiServiceProperties = aiServiceProperties;
    }

    public AiHrCopilotFeedbackResponseDto submitFeedback(
            AiHrCopilotFeedbackRequestDto payload
    ) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/hr-copilot/feedback")
                .build()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-ai-service-key", aiServiceProperties.getServiceKey());

        HttpEntity<AiHrCopilotFeedbackRequestDto> request =
                new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<AiHrCopilotFeedbackResponseDto> response =
                    aiRestTemplate.exchange(
                            uri,
                            HttpMethod.POST,
                            request,
                            AiHrCopilotFeedbackResponseDto.class
                    );

            return response.getBody();

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Impossible d’enregistrer le feedback Copilote RH.",
                    exception
            );
        }
    }
}