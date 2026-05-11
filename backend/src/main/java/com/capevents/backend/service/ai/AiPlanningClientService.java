package com.capevents.backend.service.ai;


import com.capevents.backend.config.AiServiceProperties;

import java.net.URI;

import com.capevents.backend.dto.ai.monitoring.AiPlanningMonitoringSummary;
import com.capevents.backend.dto.ai.planning.AiPlanningEventProposalRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningEventProposalResponse;
import com.capevents.backend.dto.ai.planning.AiPlanningSuggestionRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningSuggestionResponse;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import com.capevents.backend.dto.ai.planning.AiPlanningUsageRequest;
import com.capevents.backend.dto.ai.planning.AiPlanningUsageResponse;

@Service
public class AiPlanningClientService {

    private final RestTemplate aiRestTemplate;
    private final AiServiceProperties aiServiceProperties;

    public AiPlanningClientService(
            RestTemplate aiRestTemplate,
            AiServiceProperties aiServiceProperties
    ) {
        this.aiRestTemplate = aiRestTemplate;
        this.aiServiceProperties = aiServiceProperties;
    }

    public AiPlanningSuggestionResponse suggestSlots(
            AiPlanningSuggestionRequest payload
    ) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/planning/suggestions")
                .build()
                .toUri();

        return postToAiService(
                uri,
                payload,
                AiPlanningSuggestionResponse.class,
                "Le service IA Planning est indisponible."
        );
    }

    public AiPlanningEventProposalResponse proposeEvents(
            AiPlanningEventProposalRequest payload
    ) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/planning/event-proposals")
                .build()
                .toUri();

        return postToAiService(
                uri,
                payload,
                AiPlanningEventProposalResponse.class,
                "Le service IA de proposition d’événements est indisponible."
        );
    }


    public AiPlanningMonitoringSummary getMonitoringSummary(
            Integer days,
            Long targetDepartmentId
    ) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/planning/monitoring/summary")
                .queryParam("days", days != null ? days : 30);

        if (targetDepartmentId != null) {
            builder.queryParam("target_department_id", targetDepartmentId);
        }

        URI uri = builder.build().toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-ai-service-key", aiServiceProperties.getServiceKey());

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<AiPlanningMonitoringSummary> response =
                    aiRestTemplate.exchange(
                            uri,
                            HttpMethod.GET,
                            request,
                            AiPlanningMonitoringSummary.class
                    );

            return response.getBody();

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le monitoring IA Planning est indisponible.",
                    exception
            );
        }
    }

    public AiPlanningUsageResponse logUsage(
            AiPlanningUsageRequest payload
    ) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(aiServiceProperties.getBaseUrl())
                .path("/ai/planning/usage")
                .build()
                .toUri();

        return postToAiService(
                uri,
                payload,
                AiPlanningUsageResponse.class,
                "Impossible de journaliser l’usage IA Planning."
        );
    }


    private <TRequest, TResponse> TResponse postToAiService(
            URI uri,
            TRequest payload,
            Class<TResponse> responseType,
            String errorMessage
    ) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-ai-service-key", aiServiceProperties.getServiceKey());

        HttpEntity<TRequest> request = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<TResponse> response = aiRestTemplate.exchange(
                    uri,
                    HttpMethod.POST,
                    request,
                    responseType
            );

            return response.getBody();

        } catch (HttpStatusCodeException exception) {
            String aiErrorBody = exception.getResponseBodyAsString();

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    errorMessage + " Détail IA: " + aiErrorBody,
                    exception
            );

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    errorMessage + " Détail technique: " + exception.getMessage(),
                    exception
            );
        }
    }
}