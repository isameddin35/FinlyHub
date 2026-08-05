package com.finlyhub.reconciliation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.common.exception.BusinessException;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.reconciliation.dto.ReconciliationUploadResponse;
import com.finlyhub.reconciliation.entity.Reconciliation;
import com.finlyhub.reconciliation.entity.Reconciliation.ReconciliationStatus;
import com.finlyhub.reconciliation.entity.ReconciliationEntry;
import com.finlyhub.reconciliation.entity.ReconciliationEntry.MatchStatus;
import com.finlyhub.reconciliation.repository.ReconciliationEntryRepository;
import com.finlyhub.reconciliation.repository.ReconciliationRepository;
import com.finlyhub.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private ReconciliationRepository reconciliationRepository;
    @Mock private ReconciliationEntryRepository entryRepository;
    @Mock private ObjectMapper objectMapper;

    private ReconciliationService service;

    private final User user = new User();

    @BeforeEach
    void setUp() {
        user.setId(7L);
        authenticate(user);
        service = new ReconciliationService(reconciliationRepository, entryRepository, objectMapper);
    }

    private void authenticate(User principal) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private Reconciliation ownedReconciliation() {
        Reconciliation r = new Reconciliation();
        r.setId(100L);
        r.setUser(user);
        r.setTitle("Jan 2026 Bank Reconciliation");
        r.setStatus(ReconciliationStatus.COMPLETED);
        return r;
    }

    private MockMultipartFile csvFile(String name, String content) {
        return new MockMultipartFile("file", name, "text/csv", content.getBytes());
    }

    private void stubSaveBehavior(List<ReconciliationEntry> savedEntries) {
        when(reconciliationRepository.save(any(Reconciliation.class))).thenAnswer(inv -> {
            Reconciliation r = inv.getArgument(0);
            if (r.getId() == null) r.setId(1L);
            return r;
        });
        when(entryRepository.saveAll(any(List.class))).thenAnswer(inv -> {
            List<ReconciliationEntry> entries = inv.getArgument(0);
            long id = savedEntries.size() + 1;
            for (ReconciliationEntry e : entries) {
                e.setId(id++);
                savedEntries.add(e);
            }
            return entries;
        });
        when(entryRepository.countByReconciliationIdAndMatchStatus(anyLong(), any(MatchStatus.class)))
                .thenAnswer(inv -> savedEntries.stream()
                        .filter(e -> e.getMatchStatus() == inv.getArgument(1))
                        .count());
    }

    private long countStatus(List<ReconciliationEntry> entries, MatchStatus status) {
        return entries.stream().filter(e -> e.getMatchStatus() == status).count();
    }

    @Test
    void uploadAndMatch_PrimaryMatches_SetsMatchedStatusesAndCompletes() throws IOException {
        List<ReconciliationEntry> saved = new ArrayList<>();
        stubSaveBehavior(saved);

        MockMultipartFile bank = csvFile("bank.csv",
                "description,date,amount,reference\nAcme Co,2026-01-10,100.00,REF1\nWidgets,2026-01-12,50.00,REF2");
        MockMultipartFile acct = csvFile("acct.csv",
                "description,date,amount,reference\nAcme Co,2026-01-10,100.00,REF1\nWidgets,2026-01-12,50.00,REF2");

        ReconciliationUploadResponse resp = service.uploadAndMatch(
                bank, acct, "Jan 2026", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), user.getId());

        assertThat(resp.getStatus()).isEqualTo(ReconciliationStatus.COMPLETED);
        assertThat(resp.getTotalBank()).isEqualTo(2);
        assertThat(resp.getTotalAccounting()).isEqualTo(2);
        assertThat(countStatus(saved, MatchStatus.MATCHED)).isEqualTo(4);
        assertThat(countStatus(saved, MatchStatus.UNMATCHED)).isZero();
        assertThat(countStatus(saved, MatchStatus.NEEDS_REVIEW)).isZero();
    }

    @Test
    void uploadAndMatch_TertiaryMatch_MarksNeedsReview() throws IOException {
        List<ReconciliationEntry> saved = new ArrayList<>();
        stubSaveBehavior(saved);

        MockMultipartFile bank = csvFile("bank.csv",
                "description,date,amount,reference\nAcme Corp,2026-01-10,100.00,REF1");
        MockMultipartFile acct = csvFile("acct.csv",
                "description,date,amount,reference\nAcme Corp,2026-01-10,98.00,REF1");

        ReconciliationUploadResponse resp = service.uploadAndMatch(
                bank, acct, "Jan 2026", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), user.getId());

        assertThat(resp.getStatus()).isEqualTo(ReconciliationStatus.COMPLETED);
        assertThat(countStatus(saved, MatchStatus.NEEDS_REVIEW)).isEqualTo(2);
        assertThat(countStatus(saved, MatchStatus.MATCHED)).isZero();
    }

    @Test
    void uploadAndMatch_HeaderlessFile_KeepsFirstDataRow() throws IOException {
        List<ReconciliationEntry> saved = new ArrayList<>();
        stubSaveBehavior(saved);

        MockMultipartFile bank = csvFile("bank.csv",
                "Acme Co,2026-01-10,100.00,REF1\nWidgets,2026-01-12,50.00,REF2");
        MockMultipartFile acct = csvFile("acct.csv",
                "description,date,amount,reference\nAcme Co,2026-01-10,100.00,REF1\nWidgets,2026-01-12,50.00,REF2");

        ReconciliationUploadResponse resp = service.uploadAndMatch(
                bank, acct, "Jan 2026", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), user.getId());

        assertThat(resp.getTotalBank()).isEqualTo(2);
    }

    @Test
    void uploadAndMatch_QuotedCsvFields_ParsesCommasInDescription() throws IOException {
        List<ReconciliationEntry> saved = new ArrayList<>();
        stubSaveBehavior(saved);

        MockMultipartFile bank = csvFile("bank.csv",
                "description,date,amount,reference\n\"Acme, Inc.\",2026-01-10,100.00,REF1");
        MockMultipartFile acct = csvFile("acct.csv",
                "description,date,amount,reference\nAcme Co,2026-01-10,100.00,REF1");

        ReconciliationUploadResponse resp = service.uploadAndMatch(
                bank, acct, "Jan 2026", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), user.getId());

        assertThat(resp.getTotalBank()).isEqualTo(1);
        assertThat(countStatus(saved, MatchStatus.MATCHED)).isEqualTo(2);
    }

    @Test
    void uploadAndMatch_EmptyFile_ThrowsBusinessException() {
        MockMultipartFile bank = csvFile("bank.csv", "");
        MockMultipartFile acct = csvFile("acct.csv", "description,date,amount,reference\nAcme Co,2026-01-10,100.00,REF1");

        assertThatThrownBy(() -> service.uploadAndMatch(
                bank, acct, "Jan 2026", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), user.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("bank statement");
    }

    @Test
    void getReconciliationDetail_Owned_ReturnsBuckets() {
        Reconciliation reconciliation = ownedReconciliation();
        when(reconciliationRepository.findById(100L)).thenReturn(Optional.of(reconciliation));

        List<ReconciliationEntry> entries = new ArrayList<>();
        entries.add(entryWithStatus(MatchStatus.MATCHED, 1L));
        entries.add(entryWithStatus(MatchStatus.UNMATCHED, 2L));
        entries.add(entryWithStatus(MatchStatus.NEEDS_REVIEW, 3L));
        when(entryRepository.findByReconciliationId(100L)).thenReturn(entries);

        var detail = service.getReconciliationDetail(100L);

        assertThat(detail.getMatched()).hasSize(1);
        assertThat(detail.getUnmatched()).hasSize(1);
        assertThat(detail.getNeedsReview()).hasSize(1);
        assertThat(detail.getReconciliation().getId()).isEqualTo(100L);
    }

    @Test
    void getReconciliationDetail_OtherUser_ThrowsResourceNotFound() {
        User other = new User();
        other.setId(999L);
        authenticate(other);

        Reconciliation reconciliation = ownedReconciliation();
        when(reconciliationRepository.findById(100L)).thenReturn(Optional.of(reconciliation));

        assertThatThrownBy(() -> service.getReconciliationDetail(100L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void approveReconciliation_Owned_SetsApproved() {
        Reconciliation reconciliation = ownedReconciliation();
        reconciliation.setStatus(ReconciliationStatus.COMPLETED);
        when(reconciliationRepository.findById(100L)).thenReturn(Optional.of(reconciliation));
        when(reconciliationRepository.save(any(Reconciliation.class))).thenReturn(reconciliation);

        service.approveReconciliation(100L, user.getId());

        verify(reconciliationRepository).save(reconciliation);
        assertThat(reconciliation.getStatus()).isEqualTo(ReconciliationStatus.APPROVED);
        assertThat(reconciliation.getApprovedBy()).isEqualTo(7L);
        assertThat(reconciliation.getApprovedAt()).isNotNull();
    }

    @Test
    void approveReconciliation_OtherUser_ThrowsResourceNotFound() {
        User other = new User();
        other.setId(999L);
        authenticate(other);

        Reconciliation reconciliation = ownedReconciliation();
        when(reconciliationRepository.findById(100L)).thenReturn(Optional.of(reconciliation));

        assertThatThrownBy(() -> service.approveReconciliation(100L, user.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private ReconciliationEntry entryWithStatus(MatchStatus status, long id) {
        ReconciliationEntry e = new ReconciliationEntry();
        e.setId(id);
        e.setReconciliation(ownedReconciliation());
        e.setMatchStatus(status);
        e.setDescription("desc");
        e.setAmount(java.math.BigDecimal.TEN);
        e.setTransactionDate(LocalDate.of(2026, 1, 10));
        return e;
    }
}
