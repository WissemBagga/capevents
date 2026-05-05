package com.capevents.backend.repository;

import com.capevents.backend.entity.EventInvitationReminder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventInvitationReminderRepository extends JpaRepository<EventInvitationReminder, Long> {

}