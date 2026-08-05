package com.finlyhub.report.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.ChatResponse;
import com.finlyhub.common.service.AiService;
import com.finlyhub.report.dto.ReportRequest;
import com.finlyhub.report.dto.ReportResponse;
import com.finlyhub.report.entity.Report;
import com.finlyhub.report.entity.Report.ReportStatus;
import com.finlyhub.report.entity.Report.ReportSubtype;
import com.finlyhub.report.entity.Report.ReportType;
import com.finlyhub.report.repository.ReportRepository;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.Transaction.TransactionType;
import com.finlyhub.transaction.entity.TransactionCategory;
import com.finlyhub.transaction.repository.TransactionRepository;
import com.finlyhub.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportGeneratorServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AiService aiService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ReportGeneratorService service;
    private final User user = new User();

    @BeforeEach
    void setUp() {
        user.setId(7L);
        service = new ReportGeneratorService(reportRepository, transactionRepository, aiService, objectMapper);
    }

    @Test
    void createReportSetsGeneratingStatusAndTitle() {
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            if (r.getId() == null) r.setId(1L);
            return r;
        });

        ReportRequest request = request(ReportType.EXPENSE, ReportSubtype.MONTHLY,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
        ReportResponse response = service.createReport(request, 7L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getStatus()).isEqualTo(ReportStatus.GENERATING);
        assertThat(response.getTitle()).contains("EXPENSE MONTHLY Report");
    }

    @Test
    void monthlyAggregationProducesOnlyMonthlyBuckets() {
        Report report = generate(report(ReportType.CASHFLOW, ReportSubtype.MONTHLY),
                List.of(
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 10), -15, "Meals", "Starbucks"),
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 20), -30, "Meals", "Uber"),
                        transaction(TransactionType.REVENUE, LocalDate.of(2026, 2, 5), 1000, null, null)));

        ReportResponse response = service.getReportById(7L, report.getId());

        assertThat(response.getStatus()).isEqualTo(ReportStatus.COMPLETED);
        assertThat(response.getAiInsights()).isEqualTo("insight");
        @SuppressWarnings("unchecked")
        List<String> labels = (List<String>) response.getData().get("labels");
        @SuppressWarnings("unchecked")
        List<Double> values = (List<Double>) response.getData().get("values");
        assertThat(labels).containsExactly("2026-01", "2026-02");
        assertThat(values).containsExactly(-45.0, 1000.0);
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) response.getData().get("totals");
        assertThat(((Number) totals.get("total")).doubleValue()).isEqualTo(955.0);
        assertThat(((Number) totals.get("count")).intValue()).isEqualTo(3);
    }

    @Test
    void profitMathUsesAbsoluteExpenses() {
        Report report = generate(report(ReportType.PROFIT, ReportSubtype.MONTHLY),
                List.of(
                        transaction(TransactionType.REVENUE, LocalDate.of(2026, 1, 5), 1000, null, null),
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 10), -400, "Software", null),
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 15), -100, "Meals", null)));

        ReportResponse response = service.getReportById(7L, report.getId());

        assertThat(((Number) response.getData().get("totalRevenue")).doubleValue()).isEqualTo(1000.0);
        assertThat(((Number) response.getData().get("totalExpense")).doubleValue()).isEqualTo(500.0);
        assertThat(((Number) response.getData().get("netProfit")).doubleValue()).isEqualTo(500.0);
    }

    @Test
    void revenueTypeFiltersOutExpenses() {
        Report report = generate(report(ReportType.REVENUE, ReportSubtype.MONTHLY),
                List.of(
                        transaction(TransactionType.REVENUE, LocalDate.of(2026, 1, 5), 1000, null, null),
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 10), -400, "Software", null)));

        ReportResponse response = service.getReportById(7L, report.getId());

        @SuppressWarnings("unchecked")
        List<Double> values = (List<Double>) response.getData().get("values");
        assertThat(values).containsExactly(1000.0);
    }

    @Test
    void categoryGroupingUsesCategoryNames() {
        Report report = generate(report(ReportType.EXPENSE, ReportSubtype.CATEGORY),
                List.of(
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 10), -15, "Meals", null),
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 12), -120, "Software", null)));

        ReportResponse response = service.getReportById(7L, report.getId());

        @SuppressWarnings("unchecked")
        List<String> labels = (List<String>) response.getData().get("labels");
        assertThat(labels).containsExactlyInAnyOrder("Meals", "Software");
        @SuppressWarnings("unchecked")
        List<Double> values = (List<Double>) response.getData().get("values");
        assertThat(values.stream().mapToDouble(Double::doubleValue).sum()).isEqualTo(-135.0);
    }

    @Test
    void balanceSheetBuildsCumulativeBalances() {
        Report report = generate(report(ReportType.BALANCE_SHEET, ReportSubtype.MONTHLY),
                List.of(
                        transaction(TransactionType.REVENUE, LocalDate.of(2026, 1, 5), 1000, null, null),
                        transaction(TransactionType.EXPENSE, LocalDate.of(2026, 2, 10), -400, "Software", null)));

        ReportResponse response = service.getReportById(7L, report.getId());

        @SuppressWarnings("unchecked")
        List<String> labels = (List<String>) response.getData().get("labels");
        @SuppressWarnings("unchecked")
        List<Double> values = (List<Double>) response.getData().get("values");
        assertThat(labels).containsExactly("2026-01", "2026-02");
        assertThat(values).containsExactly(1000.0, 600.0);
        assertThat(((Number) response.getData().get("totalAssets")).doubleValue()).isEqualTo(600.0);
        assertThat(((Number) response.getData().get("totalEquity")).doubleValue()).isEqualTo(600.0);
        assertThat(((Number) response.getData().get("totalLiabilities")).doubleValue()).isZero();
    }

    @Test
    void getReportByIdRejectsOtherUsersReport() {
        Report report = report(ReportType.EXPENSE, ReportSubtype.MONTHLY);
        report.setId(1L);
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> service.getReportById(8L, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.getReportById(7L, 1L).getId()).isEqualTo(1L);
    }

    @Test
    void exportReportRejectsOtherUsersReport() {
        Report report = report(ReportType.EXPENSE, ReportSubtype.MONTHLY);
        report.setId(1L);
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> service.exportReport(8L, 1L, "PDF"))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.exportReport(7L, 1L, "PDF")).isNotEmpty();
    }

    @Test
    void exportReportRejectsUnsupportedFormat() {
        Report report = report(ReportType.EXPENSE, ReportSubtype.MONTHLY);
        report.setId(1L);
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> service.exportReport(7L, 1L, "CSV"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void exportToPdfHandlesInsightsWithControlCharacters() {
        Report report = report(ReportType.EXPENSE, ReportSubtype.MONTHLY);
        report.setId(1L);
        report.setAiInsights("Line one\nLine two\r\n• bullet — dash → arrow");
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));

        byte[] pdf = service.exportReport(7L, 1L, "PDF");

        assertThat(pdf).isNotEmpty();
        assertThat(pdf[0]).isEqualTo((byte) '%');
    }

    @Test
    void asyncGenerationCompletesWhenInsightsAreUnavailable() {
        Report report = report(ReportType.EXPENSE, ReportSubtype.MONTHLY);
        report.setId(1L);
        report.setStatus(ReportStatus.GENERATING);
        when(reportRepository.findById(1L)).thenReturn(Optional.of(report));
        when(transactionRepository.findByUserIdAndTransactionDateBetween(any(), any(), any()))
                .thenReturn(List.of(transaction(TransactionType.EXPENSE, LocalDate.of(2026, 1, 10), -15, "Meals", null)));
        when(aiService.chat(any())).thenThrow(new RuntimeException("provider down"));

        service.generateReportAsync(1L);

        assertThat(report.getStatus()).isEqualTo(ReportStatus.COMPLETED);
        assertThat(report.getAiInsights()).isEqualTo("AI insights temporarily unavailable.");
    }

    private Report generate(Report report, List<Transaction> transactions) {
        report.setStatus(ReportStatus.GENERATING);
        when(reportRepository.findById(report.getId())).thenReturn(Optional.of(report));
        when(transactionRepository.findByUserIdAndTransactionDateBetween(any(), any(), any()))
                .thenReturn(transactions);
        when(aiService.chat(any())).thenReturn(ChatResponse.builder().message("insight").build());
        service.generateReportAsync(report.getId());
        return report;
    }

    private Report report(ReportType type, ReportSubtype subtype) {
        Report report = new Report();
        report.setId(1L);
        report.setUser(user);
        report.setType(type);
        report.setSubtype(subtype);
        report.setTitle(type + " " + subtype + " Report");
        report.setStatus(ReportStatus.GENERATING);
        report.setPeriodStart(LocalDate.of(2026, 1, 1));
        report.setPeriodEnd(LocalDate.of(2026, 2, 28));
        return report;
    }

    private ReportRequest request(ReportType type, ReportSubtype subtype, LocalDate start, LocalDate end) {
        return ReportRequest.builder()
                .type(type)
                .subtype(subtype)
                .periodStart(start)
                .periodEnd(end)
                .build();
    }

    private Transaction transaction(TransactionType type, LocalDate date, double amount,
                                    String categoryName, String vendor) {
        Transaction t = new Transaction();
        t.setTransactionType(type);
        t.setTransactionDate(date);
        t.setAmount(BigDecimal.valueOf(amount));
        if (categoryName != null) {
            TransactionCategory category = new TransactionCategory();
            category.setName(categoryName);
            t.setCategory(category);
        }
        t.setVendor(vendor);
        return t;
    }
}
