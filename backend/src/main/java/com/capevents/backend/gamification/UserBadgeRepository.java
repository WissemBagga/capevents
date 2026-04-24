package com.capevents.backend.gamification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    boolean existsByUserIdAndBadgeCode(UUID userId, BadgeCode badgeCode);
    List<UserBadge> findByUserIdOrderByUnlockedAtDesc(UUID userId);
}