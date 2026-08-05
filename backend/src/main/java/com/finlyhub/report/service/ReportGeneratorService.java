package com.finlyhub.report.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.common.exception.BusinessException;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.ChatRequest;
import com.finlyhub.common.service.AiService;
import com.finlyhub.report.dto.ReportRequest;
import com.finlyhub.report.dto.ReportResponse;
import com.finlyhub.report.dto.ReportSummaryResponse;
import com.finlyhub.report.entity.Report;
import com.finlyhub.report.entity.Report.ExportFormat;
import com.finlyhub.report.entity.Report.ReportStatus;
import com.finlyhub.report.entity.Report.ReportType;
import com.finlyhub.report.repository.ReportRepository;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.Transaction.TransactionType;
import com.finlyhub.transaction.repository.TransactionRepository;
import com.finlyhub.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportGeneratorService {

    private final ReportRepository reportRepository;
    private final TransactionRepository transactionRepository;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    public ReportResponse createReport(ReportRequest request, Long userId) {
        Report report = new Report();
        User userRef = new User();
        userRef.setId(userId);
        report.setUser(userRef);

        String title = String.format("%s %s Report", request.getType(), request.getSubtype());
        if (request.getPeriodStart() != null && request.getPeriodEnd() != null) {
            title += " (" + request.getPeriodStart() + " - " + request.getPeriodEnd() + ")";
        }
        report.setTitle(title);
        report.setType(request.getType());
        report.setSubtype(request.getSubtype());
        report.setPeriodStart(request.getPeriodStart());
        report.setPeriodEnd(request.getPeriodEnd());
        report.setStatus(ReportStatus.GENERATING);
        report.setExportFormat(ExportFormat.NONE);

        if (request.getParameters() != null) {
            try {
                report.setParameters(objectMapper.writeValueAsString(request.getParameters()));
            } catch (JsonProcessingException e) {
                throw new BusinessException("Failed to serialize parameters");
            }
        }

        report = reportRepository.save(report);
        return toResponse(report);
    }

    @Async("reportGenerationExecutor")
    @Transactional
    public void generateReportAsync(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", reportId));

        try {
            ReportRequest request = ReportRequest.builder()
                    .type(report.getType())
                    .subtype(report.getSubtype())
                    .periodStart(report.getPeriodStart())
                    .periodEnd(report.getPeriodEnd())
                    .build();

            LocalDate start = report.getPeriodStart() != null ? report.getPeriodStart() : LocalDate.of(2000, 1, 1);
            LocalDate end = report.getPeriodEnd() != null ? report.getPeriodEnd() : LocalDate.now();
            List<Transaction> transactions = transactionRepository.findByUserIdAndTransactionDateBetween(
                    report.getUser().getId(), start, end);

            Map<String, Object> reportData = aggregateData(transactions, request);
            String aiInsights = generateAiInsights(reportData, request);
            Map<String, Object> chartConfig = generateChartConfig(reportData, request);

            report.setData(objectMapper.writeValueAsString(reportData));
            report.setAiInsights(aiInsights);
            if (chartConfig != null) {
                report.setChartConfig(objectMapper.writeValueAsString(chartConfig));
            }
            report.setStatus(ReportStatus.COMPLETED);
            reportRepository.save(report);
        } catch (Exception e) {
            report.setStatus(ReportStatus.FAILED);
            reportRepository.save(report);
            throw new BusinessException("Failed to generate report");
        }
    }

    public List<ReportSummaryResponse> getReportsByUser(Long userId) {
        return reportRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }

    public ReportResponse getReportById(Long userId, Long reportId) {
        Report report = findOwnedReport(userId, reportId);
        return toResponse(report);
    }

    public byte[] exportReport(Long userId, Long reportId, String format) {
        Report report = findOwnedReport(userId, reportId);

        return switch (format.toUpperCase()) {
            case "PDF" -> exportToPdf(report);
            case "EXCEL" -> exportToExcel(report);
            default -> throw new IllegalArgumentException("Unsupported format: " + format);
        };
    }

    private Report findOwnedReport(Long userId, Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", reportId));
        if (report.getUser() == null || !report.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Report", reportId);
        }
        return report;
    }

    private Map<String, Object> aggregateData(List<Transaction> transactions, ReportRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();

        if (request.getType() == ReportType.PROFIT) {
            Map<Boolean, List<Transaction>> partitioned = transactions.stream()
                    .collect(Collectors.partitioningBy(t -> t.getTransactionType() == TransactionType.REVENUE));
            List<Transaction> revenues = partitioned.get(true);
            List<Transaction> expenses = partitioned.get(false);
            BigDecimal totalRevenue = revenues.stream()
                    .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalExpense = expenses.stream()
                    .map(t -> t.getAmount().abs()).reduce(BigDecimal.ZERO, BigDecimal::add);
            data.put("totalRevenue", totalRevenue);
            data.put("totalExpense", totalExpense);
            data.put("netProfit", totalRevenue.subtract(totalExpense));
            return data;
        }

        if (request.getType() == ReportType.BALANCE_SHEET) {
            return aggregateBalanceSheet(transactions, request);
        }

        if (request.getType() == ReportType.REVENUE) {
            transactions = transactions.stream()
                    .filter(t -> t.getTransactionType() == TransactionType.REVENUE)
                    .collect(Collectors.toList());
        } else if (request.getType() == ReportType.EXPENSE) {
            transactions = transactions.stream()
                    .filter(t -> t.getTransactionType() == TransactionType.EXPENSE)
                    .collect(Collectors.toList());
        }

        List<String> labels = new ArrayList<>();
        List<Double> values = new ArrayList<>();

        switch (request.getSubtype()) {
            case MONTHLY -> {
                Map<String, List<Transaction>> grouped = transactions.stream()
                        .collect(Collectors.groupingBy(t ->
                                t.getTransactionDate().format(DateTimeFormatter.ofPattern("yyyy-MM"))));
                TreeMap<String, List<Transaction>> sorted = new TreeMap<>(grouped);
                for (Map.Entry<String, List<Transaction>> entry : sorted.entrySet()) {
                    labels.add(entry.getKey());
                    values.add(entry.getValue().stream()
                            .mapToDouble(t -> t.getAmount().doubleValue())
                            .sum());
                }
            }
            case QUARTERLY -> {
                Map<String, List<Transaction>> grouped = transactions.stream()
                        .collect(Collectors.groupingBy(t -> {
                            int quarter = (t.getTransactionDate().getMonthValue() - 1) / 3 + 1;
                            return t.getTransactionDate().getYear() + "-Q" + quarter;
                        }));
                TreeMap<String, List<Transaction>> sorted = new TreeMap<>(grouped);
                for (Map.Entry<String, List<Transaction>> entry : sorted.entrySet()) {
                    labels.add(entry.getKey());
                    values.add(entry.getValue().stream()
                            .mapToDouble(t -> t.getAmount().doubleValue())
                            .sum());
                }
            }
            case ANNUAL -> {
                Map<Integer, List<Transaction>> grouped = transactions.stream()
                        .collect(Collectors.groupingBy(t -> t.getTransactionDate().getYear()));
                TreeMap<Integer, List<Transaction>> sorted = new TreeMap<>(grouped);
                for (Map.Entry<Integer, List<Transaction>> entry : sorted.entrySet()) {
                    labels.add(String.valueOf(entry.getKey()));
                    values.add(entry.getValue().stream()
                            .mapToDouble(t -> t.getAmount().doubleValue())
                            .sum());
                }
            }
            case CATEGORY -> {
                Map<String, List<Transaction>> grouped = transactions.stream()
                        .collect(Collectors.groupingBy(t ->
                                t.getCategory() != null ? t.getCategory().getName() : "Uncategorized"));
                for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {
                    labels.add(entry.getKey());
                    values.add(entry.getValue().stream()
                            .mapToDouble(t -> t.getAmount().doubleValue())
                            .sum());
                }
            }
            case VENDOR -> {
                Map<String, List<Transaction>> grouped = transactions.stream()
                        .collect(Collectors.groupingBy(t ->
                                t.getVendor() != null ? t.getVendor() : "Unknown"));
                for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {
                    labels.add(entry.getKey());
                    values.add(entry.getValue().stream()
                            .mapToDouble(t -> t.getAmount().doubleValue())
                            .sum());
                }
            }
            case DEPARTMENT -> {
                Map<String, List<Transaction>> grouped = transactions.stream()
                        .collect(Collectors.groupingBy(t ->
                                t.getDepartment() != null ? t.getDepartment() : "Unassigned"));
                for (Map.Entry<String, List<Transaction>> entry : grouped.entrySet()) {
                    labels.add(entry.getKey());
                    values.add(entry.getValue().stream()
                            .mapToDouble(t -> t.getAmount().doubleValue())
                            .sum());
                }
            }
        }

        data.put("labels", labels);
        data.put("values", values);

        double total = values.stream().mapToDouble(Double::doubleValue).sum();
        double average = values.isEmpty() ? 0 : total / values.size();
        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("total", total);
        totals.put("average", average);
        totals.put("count", transactions.size());
        data.put("totals", totals);

        return data;
    }

    private Map<String, Object> aggregateBalanceSheet(List<Transaction> transactions, ReportRequest request) {
        Map<String, BigDecimal> nets = switch (request.getSubtype()) {
            case MONTHLY -> transactions.stream().collect(Collectors.groupingBy(
                    t -> t.getTransactionDate().format(DateTimeFormatter.ofPattern("yyyy-MM")), TreeMap::new,
                    Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));
            case QUARTERLY -> transactions.stream().collect(Collectors.groupingBy(
                    t -> {
                        int quarter = (t.getTransactionDate().getMonthValue() - 1) / 3 + 1;
                        return t.getTransactionDate().getYear() + "-Q" + quarter;
                    }, TreeMap::new,
                    Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));
            default -> transactions.stream().collect(Collectors.groupingBy(
                    t -> String.valueOf(t.getTransactionDate().getYear()), TreeMap::new,
                    Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));
        };

        List<String> labels = new ArrayList<>();
        List<Double> values = new ArrayList<>();
        BigDecimal running = BigDecimal.ZERO;
        for (Map.Entry<String, BigDecimal> entry : nets.entrySet()) {
            labels.add(entry.getKey());
            running = running.add(entry.getValue());
            values.add(running.doubleValue());
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("labels", labels);
        data.put("values", values);
        data.put("totalAssets", running);
        data.put("totalEquity", running);
        data.put("totalLiabilities", BigDecimal.ZERO);
        return data;
    }

    private String generateAiInsights(Map<String, Object> reportData, ReportRequest request) {
        try {
            String summary = "Report Type: " + request.getType()
                    + "\nReport Subtype: " + request.getSubtype()
                    + "\nPeriod: " + request.getPeriodStart() + " to " + request.getPeriodEnd()
                    + "\nData: " + objectMapper.writeValueAsString(reportData)
                    + "\nGenerate an executive summary for this financial data including key trends, insights, and recommendations.";

            ChatRequest chatRequest = ChatRequest.builder()
                    .message(summary)
                    .build();

            var response = aiService.chat(chatRequest);
            return response != null ? response.getMessage() : "AI insights generation completed.";
        } catch (Exception e) {
            return "AI insights temporarily unavailable.";
        }
    }

    private Map<String, Object> generateChartConfig(Map<String, Object> reportData, ReportRequest request) {
        if (reportData.get("labels") == null) {
            return null;
        }

        Map<String, Object> chartConfig = new LinkedHashMap<>();

        String chartType = switch (request.getSubtype()) {
            case CATEGORY, VENDOR, DEPARTMENT -> "pie";
            case MONTHLY, QUARTERLY, ANNUAL -> "bar";
        };

        chartConfig.put("type", chartType);
        chartConfig.put("labels", reportData.get("labels"));

        List<Map<String, Object>> datasets = new ArrayList<>();
        Map<String, Object> dataset = new LinkedHashMap<>();
        dataset.put("label", request.getType().toString());
        dataset.put("data", reportData.get("values"));

        String[] backgroundColors = {
                "#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
                "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
        };

        if ("pie".equals(chartType)) {
            dataset.put("backgroundColor", backgroundColors);
        }

        datasets.add(dataset);
        chartConfig.put("datasets", datasets);

        return chartConfig;
    }

    private ReportResponse toResponse(Report report) {
        ReportResponse.ReportResponseBuilder builder = ReportResponse.builder()
                .id(report.getId())
                .title(report.getTitle())
                .type(report.getType())
                .subtype(report.getSubtype())
                .aiInsights(report.getAiInsights())
                .status(report.getStatus())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .createdAt(report.getCreatedAt());

        try {
            if (report.getData() != null) {
                builder.data(objectMapper.readValue(report.getData(),
                        new TypeReference<Map<String, Object>>() {}));
            }
            if (report.getChartConfig() != null) {
                builder.chartConfig(objectMapper.readValue(report.getChartConfig(),
                        new TypeReference<Map<String, Object>>() {}));
            }
        } catch (IOException e) {
            throw new BusinessException("Failed to parse report data");
        }

        return builder.build();
    }

    private ReportSummaryResponse toSummaryResponse(Report report) {
        return ReportSummaryResponse.builder()
                .id(report.getId())
                .title(report.getTitle())
                .type(report.getType())
                .subtype(report.getSubtype())
                .status(report.getStatus())
                .periodStart(report.getPeriodStart())
                .periodEnd(report.getPeriodEnd())
                .createdAt(report.getCreatedAt())
                .build();
    }

    private byte[] exportToPdf(Report report) {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            PDType1Font helvetica = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font helveticaBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                cs.setFont(helveticaBold, 18);
                cs.beginText();
                cs.newLineAtOffset(50, 750);
                cs.showText(sanitizePdfText(report.getTitle()));
                cs.endText();

                cs.setFont(helvetica, 11);
                cs.beginText();
                cs.newLineAtOffset(50, 720);
                cs.showText(sanitizePdfText("Type: " + report.getType() + "  Subtype: " + report.getSubtype()));
                cs.newLineAtOffset(0, -20);
                cs.showText(sanitizePdfText("Period: " + report.getPeriodStart() + " to " + report.getPeriodEnd()));
                cs.newLineAtOffset(0, -20);
                cs.showText(sanitizePdfText("Status: " + report.getStatus()));
                cs.newLineAtOffset(0, -20);
                cs.showText(sanitizePdfText("Generated: " + report.getCreatedAt()));
                cs.newLineAtOffset(0, -30);

                if (report.getAiInsights() != null) {
                    cs.setFont(helveticaBold, 13);
                    cs.showText("AI Insights:");
                    cs.newLineAtOffset(0, -20);
                    cs.setFont(helvetica, 11);
                    String insights = sanitizePdfText(report.getAiInsights());
                    int lineLen = 90;
                    for (int i = 0; i < insights.length(); i += lineLen) {
                        int end = Math.min(i + lineLen, insights.length());
                        cs.showText(insights.substring(i, end));
                        cs.newLineAtOffset(0, -15);
                    }
                }
                cs.endText();
            }

            document.save(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("Failed to generate PDF");
        }
    }

    private String sanitizePdfText(String text) {
        if (text == null) return "";
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '\r' || c == '\n') {
                sb.append(' ');
            } else if (Character.isISOControl(c)) {
                continue;
            } else if (c <= 0xFF || isWinAnsiSymbol(c)) {
                sb.append(c);
            } else {
                sb.append('?');
            }
        }
        return sb.toString();
    }

    private boolean isWinAnsiSymbol(char c) {
        return switch (c) {
            case 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2020, 0x2021,
                    0x2022, 0x2026, 0x2030, 0x2039, 0x203A, 0x20AC, 0x2122, 0x0152, 0x0153,
                    0x0160, 0x0161, 0x0178, 0x017D, 0x017E, 0x0174, 0x0175, 0x0192, 0x02C6, 0x02DC -> true;
            default -> false;
        };
    }

    private byte[] exportToExcel(Report report) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Report");

            Map<String, Object> data = objectMapper.readValue(report.getData(),
                    new TypeReference<Map<String, Object>>() {});

            Row titleRow = sheet.createRow(0);
            titleRow.createCell(0).setCellValue(report.getTitle());

            Row headerRow = sheet.createRow(2);
            headerRow.createCell(0).setCellValue("Label");
            headerRow.createCell(1).setCellValue("Value");

            @SuppressWarnings("unchecked")
            List<String> labels = (List<String>) data.get("labels");
            @SuppressWarnings("unchecked")
            List<Number> values = (List<Number>) data.get("values");

            if (labels != null && values != null) {
                for (int i = 0; i < labels.size(); i++) {
                    Row row = sheet.createRow(3 + i);
                    row.createCell(0).setCellValue(labels.get(i));
                    row.createCell(1).setCellValue(values.get(i).doubleValue());
                }
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> totals = (Map<String, Object>) data.get("totals");
            if (totals != null) {
                int totalRow = 3 + (labels != null ? labels.size() : 0) + 1;
                Row row = sheet.createRow(totalRow);
                row.createCell(0).setCellValue("Total");
                if (totals.get("total") instanceof Number totalVal) {
                    row.createCell(1).setCellValue(totalVal.doubleValue());
                }
            }

            workbook.write(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("Failed to generate Excel");
        }
    }
}
