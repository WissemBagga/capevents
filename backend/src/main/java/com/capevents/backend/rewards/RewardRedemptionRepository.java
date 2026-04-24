package com.capevents.backend.rewards;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, Long> {

    List<RewardRedemption> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("""
        select coalesce(sum(r.pointsSpent), 0)
        from RewardRedemption r
        where r.user.id = :userId
    """)
    long sumPointsSpentByUserId(@Param("userId") UUID userId);
}