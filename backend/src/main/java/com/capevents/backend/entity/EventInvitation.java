package com.capevents.backend.entity;

import com.capevents.backend.entity.enums.InvitationResponseStatus;
import com.capevents.backend.entity.enums.InvitationStatus;
import com.capevents.backend.entity.enums.InvitationTargetType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
        name = "event_invitations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_event_user_invitation", columnNames = {"event_id", "user_id"})
        }
)
public class EventInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invited_by", nullable = false)
    private User invitedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private InvitationTargetType targetType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "rsvp_response", length = 20)
    private InvitationResponseStatus rsvpResponse;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();
}