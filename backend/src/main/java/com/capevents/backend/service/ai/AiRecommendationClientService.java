package com.capevents.backend.service.ai;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.capevents.backend.config.AiServiceProperties;
import com.capevents.backend.dto.ai.recommendation.AiRecommendationItemDto;
import com.capevents.backend.dto.ai.recommendation.AiRecommendationResponseDto;
import com.capevents.backend.entity.Event;
import com.capevents.backend.repository.EventRepository;
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
    private final EventRepository eventRepository;

    public AiRecommendationClientService(
            RestTemplate aiRestTemplate,
            AiServiceProperties aiServiceProperties,
            EventRepository eventRepository
    ) {
        this.aiRestTemplate = aiRestTemplate;
        this.aiServiceProperties = aiServiceProperties;
        this.eventRepository = eventRepository;
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

            return enrichRecommendationsWithEventDetails(body);

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le service IA de recommandation est indisponible.",
                    exception
            );
        }
    }

    private AiRecommendationResponseDto enrichRecommendationsWithEventDetails(
            AiRecommendationResponseDto aiResponse
    ) {
        if (aiResponse.items() == null || aiResponse.items().isEmpty()) {
            return aiResponse;
        }

        List<UUID> eventIds = aiResponse.items()
                .stream()
                .map(AiRecommendationItemDto::eventId)
                .filter(this::isValidUuid)
                .map(UUID::fromString)
                .distinct()
                .toList();

        if (eventIds.isEmpty()) {
            return aiResponse;
        }

        Map<UUID, Event> eventsById = eventRepository.findAllById(eventIds)
                .stream()
                .collect(Collectors.toMap(Event::getId, Function.identity()));

        List<AiRecommendationItemDto> enrichedItems = aiResponse.items()
                .stream()
                .map(item -> enrichItem(item, eventsById))
                .toList();

        return new AiRecommendationResponseDto(
                aiResponse.userId(),
                aiResponse.totalCandidates(),
                enrichedItems,
                aiResponse.message()
        );
    }

    private AiRecommendationItemDto enrichItem(
            AiRecommendationItemDto item,
            Map<UUID, Event> eventsById
    ) {
        if (!isValidUuid(item.eventId())) {
            return item;
        }

        Event event = eventsById.get(UUID.fromString(item.eventId()));

        if (event == null) {
            return item;
        }

        return new AiRecommendationItemDto(
                item.eventId(),
                event.getTitle(),
                event.getCategory(),
                event.getStartAt() != null ? event.getStartAt().toString() : null,
                item.rank(),
                item.score(),
                item.reasons() != null ? item.reasons() : Collections.emptyList()
        );
    }

    private boolean isValidUuid(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}