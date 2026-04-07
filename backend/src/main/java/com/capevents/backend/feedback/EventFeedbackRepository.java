package com.capevents.backend.feedback;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventFeedbackRepository extends JpaRepository<EventFeedback, Long> {

    Optional<EventFeedback> findByEventIdAndUserId(UUID eventId, UUID userId);

    boolean existsByEventIdAndUserId(UUID eventId, UUID userId);

    List<EventFeedback> findByEventIdOrderByCreatedAtDesc(UUID eventId);
}