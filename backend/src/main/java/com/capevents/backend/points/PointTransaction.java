package com.capevents.backend.points;

import com.capevents.backend.event.Event;
import com.capevents.backend.user.User;
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
        name = "points_transactions",
        indexes = {
                @Index(name = "idx_points_transactions_user_created_at", columnList = "user_id, created_at"),
                @Index(name = "idx_points_transactions_user_event_type", columnList = "user_id, event_id, type")
        }
)
public class PointTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PointTransactionType type;

    @Column(name = "points_delta", nullable = false)
    private Integer pointsDelta;

    @Column(nullable = false, length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}