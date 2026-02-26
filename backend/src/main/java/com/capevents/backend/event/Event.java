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

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name= "updated_at")
    private Instant updatedAt;

    @Column(name="cancel_reason")
    private String  cancelReason;

    @Column(name = "image_url")
    private String imageUrl;

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

