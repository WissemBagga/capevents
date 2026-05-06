package com.capevents.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiDiagnosticsResponseDto(
        String status,

        @JsonProperty("model_loaded")
        Boolean modelLoaded,

        @JsonProperty("features_loaded")
        Boolean featuresLoaded,

        @JsonProperty("model_name")
        String modelName,

        @JsonProperty("model_version")
        String modelVersion,

        @JsonProperty("features_count")
        Integer featuresCount,

        @JsonProperty("categorical_features_count")
        Integer categoricalFeaturesCount,

        @JsonProperty("runtime_users_count")
        Integer runtimeUsersCount,

        @JsonProperty("runtime_events_count")
        Integer runtimeEventsCount,

        @JsonProperty("runtime_published_events_count")
        Integer runtimePublishedEventsCount,

        @JsonProperty("runtime_registrations_count")
        Integer runtimeRegistrationsCount,

        @JsonProperty("runtime_feedbacks_count")
        Integer runtimeFeedbacksCount,

        @JsonProperty("runtime_invitations_count")
        Integer runtimeInvitationsCount,

        @JsonProperty("ollama_available")
        Boolean ollamaAvailable,

        @JsonProperty("ollama_model")
        String ollamaModel,

        String message
) {
}
