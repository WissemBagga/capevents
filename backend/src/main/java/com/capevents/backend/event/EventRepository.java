package com.capevents.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findByStatusOrderByCreatedAtAsc(EventStatus status);
    List<Event> findByStatusAndStartAtAfterOrderByCreatedAtAsc(EventStatus status, Instant now);

    List<Event> findAllByOrderByCreatedAtDesc();
    List<Event> findByStatus(EventStatus status);
    @Query("""
        select e from Event e
        where e.status = com.capevents.backend.event.EventStatus.PUBLISHED
        and e.startAt >= :from
        and (:category is null or e.category = :category)
        order by e.startAt asc
    """)
    List<Event> searchPublished(@Param("from") Instant from, @Param("category") String category);
}
