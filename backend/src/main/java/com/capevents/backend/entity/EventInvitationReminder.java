package com.capevents.backend.entity;

import com.capevents.backend.entity.enums.ReminderChannel;
import com.capevents.backend.entity.enums.ReminderStatus;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "event_invitation_reminders")
public class EventInvitationReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id", nullable = false)
    private EventInvitation invitation;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by", nullable = false)
    private User sentBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReminderChannel channel = ReminderChannel.EMAIL;

    @Column(length = 255)
    private String subject;

    @Column(length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReminderStatus status = ReminderStatus.SENT;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt = OffsetDateTime.now();

    public Long getId() {
        return id;
    }

    public EventInvitation getInvitation() {
        return invitation;
    }

    public void setInvitation(EventInvitation invitation) {
        this.invitation = invitation;
    }

    public User getSentBy() {
        return sentBy;
    }

    public void setSentBy(User sentBy) {
        this.sentBy = sentBy;
    }

    public ReminderChannel getChannel() {
        return channel;
    }

    public void setChannel(ReminderChannel channel) {
        this.channel = channel;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public ReminderStatus getStatus() {
        return status;
    }

    public void setStatus(ReminderStatus status) {
        this.status = status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public OffsetDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(OffsetDateTime sentAt) {
        this.sentAt = sentAt;
    }
}