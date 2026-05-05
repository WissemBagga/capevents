package com.capevents.backend.repository;

import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.EventInvitation;
import com.capevents.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventInvitationRepository extends JpaRepository<EventInvitation, Long> {


    Optional<EventInvitation> findByIdAndUser(Long id, User user);
    boolean existsByEventAndUser(Event event, User user);

    boolean existsByEventAndInvitedByAndRsvpResponseIsNull(Event event, User invitedBy);

    List<EventInvitation> findByEventOrderBySentAtDesc(Event event);

    List<EventInvitation> findByUserOrderBySentAtDesc(User user);

    List<EventInvitation> findByEventAndInvitedByOrderBySentAtDesc(Event event, User invitedBy);

    @Query(value = """
        SELECT i.*
        FROM event_invitations i
        WHERE i.event_id = :eventId
          AND i.status = 'PENDING'
          AND i.rsvp_response IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM event_invitation_reminders r
              WHERE r.invitation_id = i.id
                AND r.status = 'SENT'
                AND r.sent_at >= :cooldownAfter
          )
        ORDER BY i.sent_at ASC
        """, nativeQuery = true)
    List<EventInvitation> findPendingInvitationsEligibleForReminder(
            @Param("eventId") UUID eventId,
            @Param("cooldownAfter") OffsetDateTime cooldownAfter
    );

}