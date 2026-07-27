package com.finlyhub.audit.service;

import com.finlyhub.audit.entity.AuditLog;
import com.finlyhub.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock private AuditLogRepository auditLogRepository;
    @Mock private HttpServletRequest request;

    @Captor private ArgumentCaptor<AuditLog> logCaptor;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditLogRepository);
    }

    @Test
    void log_WithAllFields_SavesAuditLog() {
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");
        when(request.getHeader("User-Agent")).thenReturn("TestAgent/1.0");

        auditService.log(1L, "CREATE", "Invoice", 100L, "{}", "{\"amount\":150}", request);

        verify(auditLogRepository).save(logCaptor.capture());
        AuditLog saved = logCaptor.getValue();

        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getAction()).isEqualTo("CREATE");
        assertThat(saved.getEntityType()).isEqualTo("Invoice");
        assertThat(saved.getEntityId()).isEqualTo(100L);
        assertThat(saved.getOldValues()).isEqualTo("{}");
        assertThat(saved.getNewValues()).isEqualTo("{\"amount\":150}");
        assertThat(saved.getIpAddress()).isEqualTo("192.168.1.1");
        assertThat(saved.getUserAgent()).isEqualTo("TestAgent/1.0");
    }

    @Test
    void log_WithoutRequest_DoesNotSetRequestFields() {
        auditService.log(1L, "DELETE", "Transaction", 50L, null, null, null);

        verify(auditLogRepository).save(logCaptor.capture());
        AuditLog saved = logCaptor.getValue();

        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getAction()).isEqualTo("DELETE");
        assertThat(saved.getEntityId()).isEqualTo(50L);
        assertThat(saved.getIpAddress()).isNull();
        assertThat(saved.getUserAgent()).isNull();
    }

    @Test
    void log_OverloadedMethod_CallsFullMethodWithNulls() {
        auditService.log(2L, "UPDATE", "User", 10L);

        verify(auditLogRepository).save(logCaptor.capture());
        AuditLog saved = logCaptor.getValue();

        assertThat(saved.getUserId()).isEqualTo(2L);
        assertThat(saved.getAction()).isEqualTo("UPDATE");
        assertThat(saved.getEntityType()).isEqualTo("User");
        assertThat(saved.getEntityId()).isEqualTo(10L);
        assertThat(saved.getOldValues()).isNull();
        assertThat(saved.getIpAddress()).isNull();
    }
}
