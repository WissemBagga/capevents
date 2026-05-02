package com.capevents.backend.service.ai;


import java.net.URI;

import com.capevents.backend.config.AiServiceProperties;
import com.capevents.backend.dto.ai.AiRecommendationMonitoringSummaryDto;
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
public class AiMonitoringClientService {

    private final RestTemplate aiRestTemplate;
    private final AiServiceProperties aiServiceProperties;

    public AiMonitoringClientService(
            RestTemplate aiRestTemplate,
            AiServiceProperties aiServiceProperties
    ) {
        this.aiRestTemplate = aiRestTemplate;
        this.aiServiceProperties = aiServiceProperties;
    }

    public AiRecommendationMonitoringSummaryDto getRecommendationSummary(
            int maxRecent,
            int maxTopEvents
    ) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/monitoring/recommendations/summary")
                .queryParam("max_recent", maxRecent)
                .queryParam("max_top_events", maxTopEvents)
                .build()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-ai-service-key", aiServiceProperties.getServiceKey());

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<AiRecommendationMonitoringSummaryDto> response =
                    aiRestTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            request,
                            AiRecommendationMonitoringSummaryDto.class
                    );

            return response.getBody();

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le service IA de monitoring est indisponible.",
                    exception
            );
        }
    }
}