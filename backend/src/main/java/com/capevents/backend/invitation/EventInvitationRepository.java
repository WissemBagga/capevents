package com.capevents.backend.invitation;

import com.capevents.backend.event.Event;
import com.capevents.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventInvitationRepository extends JpaRepository<EventInvitation, Long> {


    Optional<EventInvitation> findByIdAndUser(Long id, User user);
    boolean existsByEventAndUser(Event event, User user);

    List<EventInvitation> findByEventOrderBySentAtDesc(Event event);

    List<EventInvitation> findByUserOrderBySentAtDesc(User user);

    List<EventInvitation> findByEventAndInvitedByOrderBySentAtDesc(Event event, User invitedBy);
}