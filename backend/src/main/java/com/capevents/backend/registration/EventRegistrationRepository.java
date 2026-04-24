package com.capevents.backend.registration;

import com.capevents.backend.event.Event;
import com.capevents.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
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

    long countByEventAndAttendanceStatus(Event event, AttendanceStatus attendanceStatus);
    List<EventRegistration> findByEventAndStatusAndAttendanceStatusOrderByRegisteredAtAsc(
            Event event,
            RegistrationStatus status,
            AttendanceStatus attendanceStatus
    );

    @Query("""
        select count(r)
        from EventRegistration r
        where r.user.id = :userId
          and r.status = com.capevents.backend.registration.RegistrationStatus.REGISTERED
          and r.attendanceStatus = com.capevents.backend.registration.AttendanceStatus.PRESENT
    """)
    long countPresentParticipationsByUserId(@Param("userId") UUID userId);

    @Query("""
        select count(r)
        from EventRegistration r
        where r.user.id = :userId
          and r.status = com.capevents.backend.registration.RegistrationStatus.REGISTERED
          and r.attendanceStatus = com.capevents.backend.registration.AttendanceStatus.PRESENT
          and r.event.startAt >= :since
    """)
    long countPresentParticipationsByUserIdSince(@Param("userId") UUID userId, @Param("since") Instant since);

}