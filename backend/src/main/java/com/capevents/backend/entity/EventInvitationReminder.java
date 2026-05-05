package com.capevents.backend.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "event_invitation_reminders")
public class EventInvitationReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    private EventInvitation invitation;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by")
    private User sentBy;

    @Column(nullable = false)
    private String channel = "EMAIL";

    private String subject;

    @Column(length = 2000)
    private String message;

    @Column(nullable = false)
    private String status = "SENT";

    @Column(length = 1000)
    private String errorMessage;

    @Column(nullable = false)
    private OffsetDateTime sentAt = OffsetDateTime.now();

}
