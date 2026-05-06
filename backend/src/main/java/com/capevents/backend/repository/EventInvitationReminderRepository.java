package com.capevents.backend.repository;

import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.EventInvitation;
import com.capevents.backend.entity.EventInvitationReminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventInvitationReminderRepository extends JpaRepository<EventInvitationReminder, Long> {
    List<EventInvitationReminder> findByInvitationEventOrderBySentAtDesc(Event event);
    List<EventInvitationReminder> findByInvitationIdAndInvitationUserEmailOrderBySentAtDesc(
            Long invitationId,
            String email
    );
    int countByInvitation(EventInvitation invitation);
    Optional<EventInvitationReminder> findTopByInvitationOrderBySentAtDesc(EventInvitation invitation);
}