package com.capevents.backend.auth;


import com.capevents.backend.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(name="password_reset_tokens")
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true,length = 120)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name="created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public PasswordResetToken() {}

    public boolean isUsed() {
        return usedAt != null;
    }

    public boolean isExpired(){
        return Instant.now().isAfter(expiresAt);
    }

}
