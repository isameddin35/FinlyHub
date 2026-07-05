package com.finlyhub.audit.service;

import com.finlyhub.audit.entity.AuditLog;
import com.finlyhub.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(Long userId, String action, String entityType, Long entityId,
                    String oldValues, String newValues, HttpServletRequest request) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setOldValues(oldValues);
        log.setNewValues(newValues);
        if (request != null) {
            log.setIpAddress(request.getRemoteAddr());
            log.setUserAgent(request.getHeader("User-Agent"));
        }
        auditLogRepository.save(log);
    }

    public void log(Long userId, String action, String entityType, Long entityId) {
        log(userId, action, entityType, entityId, null, null, null);
    }
}
