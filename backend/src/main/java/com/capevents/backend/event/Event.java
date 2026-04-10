package com.capevents.backend.event;


import com.capevents.backend.user.User;
import jakarta.persistence.*;
import jdk.jfr.EventType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "events")
public class Event {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(length = 100, nullable = false)
    private String title;

        @Column(length = 60)
        private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "duration_minutes", nullable= false)
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_type", nullable = false)
    private EventLocationType locationType;

    @Column(name = "location_name", length = 180)
    private String locationName;

    @Column(name = "meeting_url")
    private String meetingUrl;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "registration_deadline", nullable = false)
    private  Instant registrationDeadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status = EventStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventAudience audience = EventAudience.DEPARTMENT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_department_id")
    private com.capevents.backend.department.Department targetDepartment;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name= "updated_at")
    private Instant updatedAt;

    @Column(name="cancel_reason")
    private String  cancelReason;

    @Column(name = "image_url")
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "review_comment", length = 1000)
    private String reviewComment;

    @Column(name = "reminder_24h_sent_at")
    private Instant reminder24hSentAt;

    @Column(name = "deadline_reminder_48h_sent_at")
    private Instant deadlineReminder48hSentAt;

    @Column(name = "feedback_notification_sent_at")
    private Instant feedbackNotificationSentAt;


    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if(createdAt == null) {
            createdAt = Instant.now();
        }
        if(updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }
}

