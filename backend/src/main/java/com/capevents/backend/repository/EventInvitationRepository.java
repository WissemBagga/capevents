package com.capevents.backend.repository;

import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.EventInvitation;
import com.capevents.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    @Query("""
            select i
            from EventInvitation i
            join fetch i.event e
            join fetch i.user u
            where e.id = :eventId
              and i.status = 'PENDING'
              and i.rsvpResponse is null
              and not exists (
                  select 1
                  from EventInvitationReminder r
                  where r.invitation = i
                    and r.status = 'SENT'
                    and r.sentAt >= :cooldownAfter
              )
        """)
    List<EventInvitation> findPendingInvitationsEligibleForReminder(
            UUID eventId,
            OffsetDateTime cooldownAfter
    );
    
}