package com.capevents.backend.service.ai;

import java.net.URI;
import java.util.UUID;

import com.capevents.backend.config.AiServiceProperties;
import com.capevents.backend.dto.ai.AiRecommendationResponseDto;
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
public class AiRecommendationClientService {

    private final RestTemplate aiRestTemplate;
    private final AiServiceProperties aiServiceProperties;

    public AiRecommendationClientService(
            RestTemplate aiRestTemplate,
            AiServiceProperties aiServiceProperties
    ) {
        this.aiRestTemplate = aiRestTemplate;
        this.aiServiceProperties = aiServiceProperties;
    }

    public AiRecommendationResponseDto getRecommendationsForUser(UUID userId, int limit) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/recommendations/users/{userId}")
                .queryParam("limit", limit)
                .buildAndExpand(userId)
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-ai-service-key", aiServiceProperties.getServiceKey());

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<AiRecommendationResponseDto> response =
                    aiRestTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            request,
                            AiRecommendationResponseDto.class
                    );

            AiRecommendationResponseDto body = response.getBody();

            if (body == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Le service IA a retourné une réponse vide."
                );
            }

            return body;

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le service IA de recommandation est indisponible.",
                    exception
            );
        }
    }
}