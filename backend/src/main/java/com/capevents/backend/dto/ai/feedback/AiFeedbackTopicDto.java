package com.capevents.backend.dto.ai;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiFeedbackTopicDto(
        @JsonProperty("topic_id")
        Integer topicId,

        String label,

        Integer count,

        List<String> keywords
) {
}
