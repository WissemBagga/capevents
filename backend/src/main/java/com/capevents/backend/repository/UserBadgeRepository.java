package com.capevents.backend.repository;

import com.capevents.backend.entity.UserBadge;
import com.capevents.backend.entity.enums.BadgeCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    boolean existsByUserIdAndBadgeCode(UUID userId, BadgeCode badgeCode);
    List<UserBadge> findByUserIdOrderByUnlockedAtDesc(UUID userId);
}