package com.capevents.backend.security.token;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);
    @Modifying
    @Query("""
    update EmailVerificationToken t
    set t.usedAt = :usedAt
    where t.user.id = :userId
      and t.usedAt is null
""")
    void markAllUnusedByUserId(@Param("userId") UUID userId, @Param("usedAt") Instant usedAt);
}