package com.capevents.backend.audit;

import com.capevents.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void logByEmail(
            String actorEmail,
            String action,
            String entityType,
            String entityId,
            String ipAddress,
            String detailsJson
    ) {
        UUID actorId = null;

        if (actorEmail != null) {
            actorId = userRepository.findByEmail(actorEmail.toLowerCase())
                    .map(u -> u.getId())
                    .orElse(null);
        }

        log(actorId, action, entityType, entityId, ipAddress, detailsJson);
    }

    @Transactional
    public void log(
            UUID actorUserId,
            String action,
            String entityType,
            String entityId,
            String ipAddress,
            String detailsJson
    ) {
        AuditLog a = new AuditLog();
        a.setActorUserId(actorUserId);
        a.setAction(action);
        a.setEntityType(entityType);
        a.setEntityId(entityId);
        a.setIpAddress(ipAddress);
        a.setDetails(detailsJson);
        auditLogRepository.save(a);
    }
}