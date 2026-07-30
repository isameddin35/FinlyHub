package com.finlyhub.dashboard.service;

import com.finlyhub.dashboard.dto.ActivityItem;
import com.finlyhub.dashboard.dto.ChartDataPoint;
import com.finlyhub.dashboard.dto.DashboardMetricsResponse;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.repository.DocumentRepository;
import com.finlyhub.invoice.entity.Invoice;
import com.finlyhub.invoice.repository.InvoiceRepository;
import com.finlyhub.reconciliation.entity.Reconciliation;
import com.finlyhub.reconciliation.repository.ReconciliationRepository;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private InvoiceRepository invoiceRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private ReconciliationRepository reconciliationRepository;
    @Mock private DocumentRepository documentRepository;

    @InjectMocks private DashboardService dashboardService;

    @Test
    void getMetrics_WithTransactions_ReturnsCorrectMetrics() {
        Long userId = 1L;

        Transaction revenueTxn = createTransaction(userId, new BigDecimal("5000.00"), LocalDate.of(2026, 1, 15));
        Transaction expenseTxn = createTransaction(userId, new BigDecimal("-2000.00"), LocalDate.of(2026, 2, 10));

        Invoice invoice = createInvoice(userId);
        Document document = createDocument(userId);
        Reconciliation reconciliation = createReconciliation(userId);

        when(invoiceRepository.countByUserId(userId)).thenReturn(2L);
        when(transactionRepository.countByUserIdAndCategorizationStatus(userId, Transaction.CategorizationStatus.APPROVED))
                .thenReturn(1L);
        when(reconciliationRepository.countByUserIdAndStatus(userId, Reconciliation.ReconciliationStatus.APPROVED))
                .thenReturn(1L);
        when(documentRepository.countByUserIdAndStatus(userId, Document.DocumentStatus.INDEXED))
                .thenReturn(1L);
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(expenseTxn, revenueTxn)));
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(userId))
                .thenReturn(List.of(expenseTxn, revenueTxn));
        when(transactionRepository.findByUserIdAndTransactionDateBetween(userId, LocalDate.of(2026, 1, 1), LocalDate.now()))
                .thenReturn(List.of(revenueTxn, expenseTxn));
        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(reconciliationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardMetricsResponse metrics = dashboardService.getMetrics(userId);

        assertThat(metrics.getInvoicesProcessed()).isEqualTo(2);
        assertThat(metrics.getTransactionsCategorized()).isEqualTo(1);
        assertThat(metrics.getDocumentsIndexed()).isEqualTo(1);
        assertThat(metrics.getReconciliationsCompleted()).isEqualTo(1);
        assertThat(metrics.getTotalRevenue()).isEqualTo(5000.0);
        assertThat(metrics.getTotalExpenses()).isEqualTo(2000.0);
        assertThat(metrics.getHoursSaved()).isPositive();
    }

    @Test
    void getMetrics_WithNoData_ReturnsZeros() {
        Long userId = 1L;

        when(invoiceRepository.countByUserId(userId)).thenReturn(0L);
        when(transactionRepository.countByUserIdAndCategorizationStatus(userId, Transaction.CategorizationStatus.APPROVED))
                .thenReturn(0L);
        when(reconciliationRepository.countByUserIdAndStatus(userId, Reconciliation.ReconciliationStatus.APPROVED))
                .thenReturn(0L);
        when(documentRepository.countByUserIdAndStatus(userId, Document.DocumentStatus.INDEXED))
                .thenReturn(0L);
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(userId))
                .thenReturn(List.of());
        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(reconciliationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardMetricsResponse metrics = dashboardService.getMetrics(userId);

        assertThat(metrics.getInvoicesProcessed()).isZero();
        assertThat(metrics.getTransactionsCategorized()).isZero();
        assertThat(metrics.getDocumentsIndexed()).isZero();
        assertThat(metrics.getReconciliationsCompleted()).isZero();
        assertThat(metrics.getTotalRevenue()).isZero();
        assertThat(metrics.getTotalExpenses()).isZero();
    }

    @Test
    void getMetrics_RevenueTrend_BuildsMonthlyAggregation() {
        Long userId = 1L;

        Transaction t1 = createTransaction(userId, new BigDecimal("1000.00"), LocalDate.of(2026, 1, 10));
        Transaction t2 = createTransaction(userId, new BigDecimal("2000.00"), LocalDate.of(2026, 1, 20));
        Transaction t3 = createTransaction(userId, new BigDecimal("1500.00"), LocalDate.of(2026, 2, 15));

        when(invoiceRepository.countByUserId(userId)).thenReturn(0L);
        when(transactionRepository.countByUserIdAndCategorizationStatus(userId, Transaction.CategorizationStatus.APPROVED))
                .thenReturn(0L);
        when(reconciliationRepository.countByUserIdAndStatus(userId, Reconciliation.ReconciliationStatus.APPROVED))
                .thenReturn(0L);
        when(documentRepository.countByUserIdAndStatus(userId, Document.DocumentStatus.INDEXED))
                .thenReturn(0L);
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(t3, t2, t1)));
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(userId))
                .thenReturn(List.of(t3, t2, t1));
        when(transactionRepository.findByUserIdAndTransactionDateBetween(userId, LocalDate.of(2026, 1, 1), LocalDate.now()))
                .thenReturn(List.of(t1, t2, t3));
        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(reconciliationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardMetricsResponse metrics = dashboardService.getMetrics(userId);

        assertThat(metrics.getRevenueTrend()).isNotEmpty();
        ChartDataPoint janPoint = metrics.getRevenueTrend().stream()
                .filter(p -> p.getLabel().equals("Jan"))
                .findFirst().orElse(null);
        assertThat(janPoint).isNotNull();
        assertThat(janPoint.getValue()).isEqualTo(3000.0);
    }

    @Test
    void getMetrics_RecentActivity_LimitsToFiveItems() {
        Long userId = 1L;

        List<Invoice> manyInvoices = java.util.stream.IntStream.range(0, 6)
                .mapToObj(i -> createInvoice(userId))
                .toList();

        when(invoiceRepository.countByUserId(userId)).thenReturn(0L);
        when(transactionRepository.countByUserIdAndCategorizationStatus(userId, Transaction.CategorizationStatus.APPROVED))
                .thenReturn(0L);
        when(reconciliationRepository.countByUserIdAndStatus(userId, Reconciliation.ReconciliationStatus.APPROVED))
                .thenReturn(0L);
        when(documentRepository.countByUserIdAndStatus(userId, Document.DocumentStatus.INDEXED))
                .thenReturn(0L);
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(transactionRepository.findByUserIdOrderByTransactionDateDesc(userId))
                .thenReturn(List.of());
        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(manyInvoices));
        when(reconciliationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), isA(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        DashboardMetricsResponse metrics = dashboardService.getMetrics(userId);

        assertThat(metrics.getRecentActivity()).hasSizeLessThanOrEqualTo(5);
    }

    private Transaction createTransaction(Long userId, BigDecimal amount, LocalDate date) {
        Transaction t = new Transaction();
        t.setId((long) Math.abs(amount.hashCode()));
        t.setTransactionDate(date);
        t.setAmount(amount);
        t.setCategorizationStatus(Transaction.CategorizationStatus.APPROVED);
        t.setCurrency("USD");
        t.setSource(Transaction.TransactionSource.MANUAL);
        t.setDescription("Test transaction");
        t.setCreatedAt(LocalDateTime.now());
        t.setUpdatedAt(LocalDateTime.now());
        return t;
    }

    private Invoice createInvoice(Long userId) {
        Invoice inv = new Invoice();
        inv.setId(System.nanoTime() % 100000);
        inv.setStatus(Invoice.Status.APPROVED);
        inv.setInvoiceNumber("INV-" + inv.getId());
        inv.setVendorName("Test Vendor");
        inv.setCreatedAt(LocalDateTime.now());
        inv.setUpdatedAt(LocalDateTime.now());
        return inv;
    }

    private Document createDocument(Long userId) {
        Document doc = new Document();
        doc.setId(1L);
        doc.setStatus(Document.DocumentStatus.INDEXED);
        doc.setCreatedAt(LocalDateTime.now());
        doc.setUpdatedAt(LocalDateTime.now());
        return doc;
    }

    private Reconciliation createReconciliation(Long userId) {
        Reconciliation rec = new Reconciliation();
        rec.setId(1L);
        rec.setStatus(Reconciliation.ReconciliationStatus.APPROVED);
        rec.setTitle("Test Reconciliation");
        rec.setCreatedAt(LocalDateTime.now());
        return rec;
    }
}
