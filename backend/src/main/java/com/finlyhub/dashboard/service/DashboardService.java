package com.finlyhub.dashboard.service;

import com.finlyhub.dashboard.dto.ActivityItem;
import com.finlyhub.dashboard.dto.ChartDataPoint;
import com.finlyhub.dashboard.dto.DashboardMetricsResponse;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.repository.DocumentRepository;
import com.finlyhub.invoice.repository.InvoiceRepository;
import com.finlyhub.reconciliation.entity.Reconciliation;
import com.finlyhub.reconciliation.repository.ReconciliationRepository;
import com.finlyhub.transaction.entity.Transaction.CategorizationStatus;
import com.finlyhub.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InvoiceRepository invoiceRepository;
    private final TransactionRepository transactionRepository;
    private final ReconciliationRepository reconciliationRepository;
    private final DocumentRepository documentRepository;

    public DashboardMetricsResponse getMetrics(Long userId) {
        long invoicesProcessed = invoiceRepository.findByUserId(userId).size();
        long transactionsCategorized = transactionRepository
                .findByUserIdAndCategorizationStatus(userId, CategorizationStatus.APPROVED).size();
        long reconciliationsCompleted = reconciliationRepository
                .findByUserId(userId).stream()
                .filter(r -> Reconciliation.ReconciliationStatus.APPROVED.equals(r.getStatus()))
                .count();
        long documentsIndexed = documentRepository
                .findByUserIdAndStatus(userId, Document.DocumentStatus.INDEXED).size();

        var allTransactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
        double totalRevenue = allTransactions.stream()
                .filter(t -> t.getAmount().compareTo(java.math.BigDecimal.ZERO) > 0)
                .map(t -> t.getAmount().doubleValue())
                .reduce(0.0, Double::sum);
        double totalExpenses = allTransactions.stream()
                .filter(t -> t.getAmount().compareTo(java.math.BigDecimal.ZERO) < 0)
                .map(t -> Math.abs(t.getAmount().doubleValue()))
                .reduce(0.0, Double::sum);

        List<ChartDataPoint> revenueTrend = buildMonthlyTrend(userId, true);
        List<ChartDataPoint> expenseTrend = buildMonthlyTrend(userId, false);
        List<ActivityItem> recentActivity = buildRecentActivity(userId);

        return DashboardMetricsResponse.builder()
                .invoicesProcessed(invoicesProcessed)
                .documentsIndexed(documentsIndexed)
                .transactionsCategorized(transactionsCategorized)
                .reconciliationsCompleted(reconciliationsCompleted)
                .hoursSaved((invoicesProcessed * 15) + (transactionsCategorized * 5) / 60.0)
                .totalRevenue(totalRevenue)
                .totalExpenses(totalExpenses)
                .revenueTrend(revenueTrend)
                .expenseTrend(expenseTrend)
                .recentActivity(recentActivity)
                .build();
    }

    private List<ChartDataPoint> buildMonthlyTrend(Long userId, boolean isRevenue) {
        var allTransactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
        if (allTransactions.isEmpty()) {
            return List.of();
        }
        LocalDate earliest = allTransactions.stream()
                .map(t -> t.getTransactionDate())
                .min(java.time.LocalDate::compareTo)
                .orElse(LocalDate.now());
        LocalDate end = LocalDate.now();
        LocalDate start = earliest.withDayOfMonth(1);

        var transactions = transactionRepository.findByUserIdAndTransactionDateBetween(userId, start, end);

        Map<YearMonth, Double> aggregated = transactions.stream()
                .filter(t -> {
                    int cmp = t.getAmount().compareTo(java.math.BigDecimal.ZERO);
                    return isRevenue ? cmp > 0 : cmp < 0;
                })
                .collect(Collectors.groupingBy(
                        t -> YearMonth.from(t.getTransactionDate()),
                        Collectors.summingDouble(t -> Math.abs(t.getAmount().doubleValue()))
                ));

        List<ChartDataPoint> result = new ArrayList<>();
        YearMonth current = YearMonth.from(start);
        YearMonth endMonth = YearMonth.from(end);
        while (!current.isAfter(endMonth)) {
            double value = aggregated.getOrDefault(current, 0.0);
            String label = current.format(DateTimeFormatter.ofPattern("MMM"));
            result.add(ChartDataPoint.builder().label(label).value(value).build());
            current = current.plusMonths(1);
        }
        return result;
    }

    private List<ActivityItem> buildRecentActivity(Long userId) {
        List<ActivityItem> items = new ArrayList<>();

        var recentInvoices = invoiceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int invoiceLimit = Math.min(recentInvoices.size(), 3);
        for (int i = 0; i < invoiceLimit; i++) {
            var inv = recentInvoices.get(i);
            items.add(ActivityItem.builder()
                    .id(inv.getId())
                    .type("INVOICE")
                    .title("Invoice " + inv.getStatus())
                    .description((inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "Invoice")
                            + " from " + (inv.getVendorName() != null ? inv.getVendorName() : "Unknown"))
                    .timestamp(inv.getCreatedAt())
                    .build());
        }

        var recentTransactions = transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
        int txnLimit = Math.min(recentTransactions.size(), 3);
        for (int i = 0; i < txnLimit; i++) {
            var txn = recentTransactions.get(i);
            items.add(ActivityItem.builder()
                    .id(txn.getId())
                    .type("TRANSACTION")
                    .title("Transaction " + txn.getCategorizationStatus())
                    .description(txn.getDescription() + " (" + txn.getAmount() + ")")
                    .timestamp(txn.getCreatedAt())
                    .build());
        }

        var recentReconciliations = reconciliationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int recLimit = Math.min(recentReconciliations.size(), 3);
        for (int i = 0; i < recLimit; i++) {
            var rec = recentReconciliations.get(i);
            items.add(ActivityItem.builder()
                    .id(rec.getId())
                    .type("RECONCILIATION")
                    .title("Reconciliation " + rec.getStatus())
                    .description(rec.getTitle() != null ? rec.getTitle() : "Reconciliation")
                    .timestamp(rec.getCreatedAt())
                    .build());
        }

        items.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));
        if (items.size() > 5) items = items.subList(0, 5);

        return items;
    }
}
