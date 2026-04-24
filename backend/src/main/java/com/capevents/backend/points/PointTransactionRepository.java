package com.capevents.backend.points;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    boolean existsByUserIdAndEventIdAndType(UUID userId, UUID eventId, PointTransactionType type);

    List<PointTransaction> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
        select coalesce(sum(pt.pointsDelta), 0)
        from PointTransaction pt
        where pt.user.id = :userId
    """)
    long sumPointsByUserId(UUID userId);

    long countByUserIdAndType(UUID userId, PointTransactionType type);
}