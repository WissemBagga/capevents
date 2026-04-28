package com.capevents.backend.repository;

import com.capevents.backend.entity.EventFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventFeedbackRepository extends JpaRepository<EventFeedback, Long> {

    Optional<EventFeedback> findByEventIdAndUserId(UUID eventId, UUID userId);

    boolean existsByEventIdAndUserId(UUID eventId, UUID userId);

    List<EventFeedback> findByEventIdOrderByCreatedAtDesc(UUID eventId);

    long countByUserId(UUID userId);
    long countByEventId(UUID eventId);

    @Query("""
        select avg(f.rating)
        from EventFeedback f
        where f.event.id = :eventId
    """)
    Double findAverageRatingByEventId(@Param("eventId") UUID eventId);
    @Query("""
        select f
        from EventFeedback f
        where f.event.id = :eventId
          and f.shareCommentPublicly = true
          and f.comment is not null
          and trim(f.comment) <> ''
        order by f.createdAt desc
    """)
    List<EventFeedback> findPublicCommentsByEventIdOrderByCreatedAtDesc(UUID eventId);
}