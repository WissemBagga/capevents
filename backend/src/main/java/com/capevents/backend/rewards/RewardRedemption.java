package com.capevents.backend.rewards;

import com.capevents.backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "reward_redemptions")
public class RewardRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "reward_code", nullable = false, length = 50)
    private RewardCode rewardCode;

    @Column(name = "points_spent", nullable = false)
    private Integer pointsSpent;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private RewardRedemptionStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public RewardCode getRewardCode() {
        return rewardCode;
    }

    public void setRewardCode(RewardCode rewardCode) {
        this.rewardCode = rewardCode;
    }

    public Integer getPointsSpent() {
        return pointsSpent;
    }

    public void setPointsSpent(Integer pointsSpent) {
        this.pointsSpent = pointsSpent;
    }

    public RewardRedemptionStatus getStatus() {
        return status;
    }

    public void setStatus(RewardRedemptionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}