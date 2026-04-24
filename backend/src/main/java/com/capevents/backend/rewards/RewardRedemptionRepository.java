package com.capevents.backend.rewards;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, Long> {
    List<RewardRedemption> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<RewardRedemption> findByStatusOrderByCreatedAtDesc(RewardRedemptionStatus status);
    List<RewardRedemption> findByStatusInOrderByCreatedAtDesc(List<RewardRedemptionStatus> statuses);
}