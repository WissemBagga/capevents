package com.capevents.backend.repository;

import com.capevents.backend.entity.Event;
import com.capevents.backend.entity.EventInvitationReminder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventInvitationReminderRepository extends JpaRepository<EventInvitationReminder, Long> {
    List<EventInvitationReminder> findByInvitationEventOrderBySentAtDesc(Event event);
}