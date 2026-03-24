package com.capevents.backend.registration;

import com.capevents.backend.event.Event;
import com.capevents.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, Long> {

    Optional<EventRegistration> findByEventAndUser(Event event, User user);

    Optional<EventRegistration> findByEventIdAndUserId(UUID eventId, UUID userId);

    Optional<EventRegistration> findByEventIdAndUserIdAndStatus(UUID eventId, UUID userId, RegistrationStatus status);

    boolean existsByEventAndUserAndStatus(Event event, User user, RegistrationStatus status);

    boolean existsByEventIdAndUserIdAndStatus(UUID eventId, UUID userId, RegistrationStatus status);

    long countByEventAndStatus(Event event, RegistrationStatus status);

    List<EventRegistration> findByUserAndStatusOrderByRegisteredAtDesc(User user, RegistrationStatus status);

    List<EventRegistration> findByUserIdAndStatusOrderByRegisteredAtDesc(UUID userId, RegistrationStatus status);

    List<EventRegistration> findByEventAndStatusOrderByRegisteredAtAsc(Event event, RegistrationStatus status);
}