package com.capevents.backend.gamification;

import com.capevents.backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(
        name = "user_badges",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_badges_user_code",
                        columnNames = {"user_id", "badge_code"}
                )
        }
)
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "badge_code", nullable = false, length = 50)
    private BadgeCode badgeCode;

    @Column(name = "unlocked_at", nullable = false)
    private Instant unlockedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public BadgeCode getBadgeCode() {
        return badgeCode;
    }

    public void setBadgeCode(BadgeCode badgeCode) {
        this.badgeCode = badgeCode;
    }

    public Instant getUnlockedAt() {
        return unlockedAt;
    }

    public void setUnlockedAt(Instant unlockedAt) {
        this.unlockedAt = unlockedAt;
    }
}