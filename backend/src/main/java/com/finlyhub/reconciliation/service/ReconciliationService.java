package com.finlyhub.reconciliation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.reconciliation.dto.*;
import com.finlyhub.reconciliation.entity.Reconciliation;
import com.finlyhub.reconciliation.entity.Reconciliation.ReconciliationStatus;
import com.finlyhub.reconciliation.entity.ReconciliationEntry;
import com.finlyhub.reconciliation.entity.ReconciliationEntry.MatchStatus;
import com.finlyhub.reconciliation.entity.ReconciliationEntry.Source;
import com.finlyhub.reconciliation.repository.ReconciliationEntryRepository;
import com.finlyhub.reconciliation.repository.ReconciliationRepository;
import com.finlyhub.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ReconciliationService {

    private final ReconciliationRepository reconciliationRepository;
    private final ReconciliationEntryRepository entryRepository;
    private final ObjectMapper objectMapper;

    private enum MatchType {
        PRIMARY, SECONDARY, TERTIARY
    }

    public ReconciliationUploadResponse uploadAndMatch(
            MultipartFile bankFile,
            MultipartFile accountingFile,
            String title,
            LocalDate periodStart,
            LocalDate periodEnd,
            Long userId) throws IOException {

        List<String[]> bankRows = parseFile(bankFile);
        List<String[]> accountingRows = parseFile(accountingFile);

        List<String[]> bankData = bankRows.size() > 1 ? bankRows.subList(1, bankRows.size()) : bankRows;
        List<String[]> accountingData = accountingRows.size() > 1 ? accountingRows.subList(1, accountingRows.size()) : accountingRows;

        Reconciliation reconciliation = new Reconciliation();
        User userRef = new User();
        userRef.setId(userId);
        reconciliation.setUser(userRef);
        reconciliation.setTitle(title);
        reconciliation.setStatus(ReconciliationStatus.IN_PROGRESS);
        reconciliation.setPeriodStart(periodStart);
        reconciliation.setPeriodEnd(periodEnd);
        reconciliation.setTotalBankTransactions(bankData.size());
        reconciliation.setTotalAccountingTransactions(accountingData.size());
        reconciliation = reconciliationRepository.save(reconciliation);

        List<ReconciliationEntry> bankEntries = new ArrayList<>();
        for (String[] row : bankData) {
            bankEntries.add(parseEntry(reconciliation, Source.BANK, row));
        }
        bankEntries = entryRepository.saveAll(bankEntries);

        List<ReconciliationEntry> accountingEntries = new ArrayList<>();
        for (String[] row : accountingData) {
            accountingEntries.add(parseEntry(reconciliation, Source.ACCOUNTING, row));
        }
        accountingEntries = entryRepository.saveAll(accountingEntries);

        runMatching(bankEntries, accountingEntries);

        reconciliation.setMatchedCount((int) entryRepository.countByReconciliationIdAndMatchStatus(
                reconciliation.getId(), MatchStatus.MATCHED));
        reconciliation.setUnmatchedCount((int) entryRepository.countByReconciliationIdAndMatchStatus(
                reconciliation.getId(), MatchStatus.UNMATCHED));
        reconciliation.setNeedsReviewCount((int) entryRepository.countByReconciliationIdAndMatchStatus(
                reconciliation.getId(), MatchStatus.NEEDS_REVIEW));

        BigDecimal discrepancy = BigDecimal.ZERO;
        for (ReconciliationEntry entry : bankEntries) {
            if (entry.getAmountDifference() != null) {
                discrepancy = discrepancy.add(entry.getAmountDifference());
            }
        }
        reconciliation.setDiscrepancyAmount(discrepancy);
        reconciliation.setStatus(ReconciliationStatus.COMPLETED);
        reconciliation = reconciliationRepository.save(reconciliation);

        return ReconciliationUploadResponse.builder()
                .id(reconciliation.getId())
                .title(reconciliation.getTitle())
                .status(reconciliation.getStatus())
                .totalBank(reconciliation.getTotalBankTransactions())
                .totalAccounting(reconciliation.getTotalAccountingTransactions())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ReconciliationResponse> getReconciliations(Long userId) {
        return reconciliationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ReconciliationMatchResponse getReconciliationDetail(Long reconciliationId) {
        Reconciliation reconciliation = reconciliationRepository.findById(reconciliationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reconciliation", reconciliationId));

        List<ReconciliationEntry> allEntries = entryRepository.findByReconciliationId(reconciliationId);

        List<ReconciliationEntryResponse> matched = new ArrayList<>();
        List<ReconciliationEntryResponse> unmatched = new ArrayList<>();
        List<ReconciliationEntryResponse> needsReview = new ArrayList<>();

        for (ReconciliationEntry entry : allEntries) {
            ReconciliationEntryResponse resp = toEntryResponse(entry);
            if (entry.getMatchStatus() == MatchStatus.MATCHED) {
                matched.add(resp);
            } else if (entry.getMatchStatus() == MatchStatus.UNMATCHED) {
                unmatched.add(resp);
            } else if (entry.getMatchStatus() == MatchStatus.NEEDS_REVIEW) {
                needsReview.add(resp);
            }
        }

        return ReconciliationMatchResponse.builder()
                .reconciliation(toResponse(reconciliation))
                .matched(matched)
                .unmatched(unmatched)
                .needsReview(needsReview)
                .build();
    }

    public void approveReconciliation(Long reconciliationId, Long userId) {
        Reconciliation reconciliation = reconciliationRepository.findById(reconciliationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reconciliation", reconciliationId));
        reconciliation.setStatus(ReconciliationStatus.APPROVED);
        reconciliation.setApprovedBy(userId);
        reconciliation.setApprovedAt(LocalDateTime.now());
        reconciliationRepository.save(reconciliation);
    }

    private void runMatching(List<ReconciliationEntry> bankEntries,
                             List<ReconciliationEntry> accountingEntries) {
        List<ReconciliationEntry> unmatchedAccounting = new ArrayList<>(accountingEntries);

        for (ReconciliationEntry bankEntry : bankEntries) {
            ReconciliationEntry bestMatch = null;
            MatchType bestMatchType = null;

            for (ReconciliationEntry accEntry : unmatchedAccounting) {
                if (accEntry.getMatchStatus() == MatchStatus.MATCHED) continue;

                MatchType matchType = evaluateMatch(bankEntry, accEntry);
                if (matchType != null && (bestMatch == null || matchType.ordinal() < bestMatchType.ordinal())) {
                    bestMatch = accEntry;
                    bestMatchType = matchType;
                }
            }

            if (bestMatch != null) {
                bankEntry.setMatchedEntryId(bestMatch.getId());
                bestMatch.setMatchedEntryId(bankEntry.getId());

                bankEntry.setMatchStatus(MatchStatus.MATCHED);
                bestMatch.setMatchStatus(MatchStatus.MATCHED);

                BigDecimal diff = bankEntry.getAmount().subtract(bestMatch.getAmount());
                bankEntry.setAmountDifference(diff);
                bestMatch.setAmountDifference(diff.negate());

                long dateDiff = ChronoUnit.DAYS.between(
                        bankEntry.getTransactionDate(), bestMatch.getTransactionDate());
                int dateDiffInt = (int) dateDiff;
                bankEntry.setDateDifferenceDays(dateDiffInt);
                bestMatch.setDateDifferenceDays(-dateDiffInt);

                double score = switch (bestMatchType) {
                    case PRIMARY -> 0.95;
                    case SECONDARY -> 0.80;
                    case TERTIARY -> 0.60;
                };
                bankEntry.setMatchScore(BigDecimal.valueOf(score));
                bestMatch.setMatchScore(BigDecimal.valueOf(score));

                Map<String, Object> evidence = new LinkedHashMap<>();
                evidence.put("matchType", bestMatchType.name());
                evidence.put("amountMatch", bankEntry.getAmount().compareTo(bestMatch.getAmount()) == 0);
                evidence.put("dateDifferenceDays", dateDiffInt);
                try {
                    String evidenceJson = objectMapper.writeValueAsString(evidence);
                    bankEntry.setMatchEvidence(evidenceJson);
                    bestMatch.setMatchEvidence(evidenceJson);
                } catch (JsonProcessingException e) {
                    // ignore evidence serialization failure
                }

                unmatchedAccounting.remove(bestMatch);
            } else {
                bankEntry.setMatchStatus(MatchStatus.UNMATCHED);
            }

            entryRepository.save(bankEntry);
        }

        for (ReconciliationEntry accEntry : unmatchedAccounting) {
            if (accEntry.getMatchStatus() == null) {
                accEntry.setMatchStatus(MatchStatus.UNMATCHED);
                entryRepository.save(accEntry);
            }
        }
    }

    private MatchType evaluateMatch(ReconciliationEntry bankEntry, ReconciliationEntry accEntry) {
        boolean exactAmount = bankEntry.getAmount().compareTo(accEntry.getAmount()) == 0;
        long dateDiff = Math.abs(ChronoUnit.DAYS.between(
                bankEntry.getTransactionDate(), accEntry.getTransactionDate()));

        if (exactAmount && dateDiff <= 3) {
            return MatchType.PRIMARY;
        }

        if (exactAmount && dateDiff <= 7) {
            return MatchType.SECONDARY;
        }

        BigDecimal threshold = bankEntry.getAmount().multiply(BigDecimal.valueOf(0.05)).abs();
        BigDecimal amountDiff = bankEntry.getAmount().subtract(accEntry.getAmount()).abs();
        boolean amountNear = amountDiff.compareTo(threshold) <= 0;
        boolean similarDesc = isSimilarDescription(
                bankEntry.getDescription(), accEntry.getDescription());

        if (amountNear && similarDesc) {
            return MatchType.TERTIARY;
        }

        return null;
    }

    private boolean isSimilarDescription(String desc1, String desc2) {
        if (desc1 == null || desc2 == null) return false;

        Set<String> words1 = Arrays.stream(desc1.toLowerCase().split("\\s+"))
                .collect(Collectors.toSet());
        Set<String> words2 = Arrays.stream(desc2.toLowerCase().split("\\s+"))
                .collect(Collectors.toSet());

        Set<String> stopWords = Set.of("the", "a", "an", "for", "of", "to", "in",
                "and", "or", "on", "at", "by", "with", "from", "is", "it");
        words1.removeAll(stopWords);
        words2.removeAll(stopWords);

        if (words1.isEmpty() || words2.isEmpty()) return false;

        long overlap = words1.stream().filter(words2::contains).count();
        double ratio = (double) overlap / Math.min(words1.size(), words2.size());

        return ratio >= 0.5;
    }

    private ReconciliationEntry parseEntry(Reconciliation reconciliation, Source source, String[] row) {
        ReconciliationEntry entry = new ReconciliationEntry();
        entry.setReconciliation(reconciliation);
        entry.setSource(source);

        if (row.length > 0) entry.setDescription(row[0].trim());
        if (row.length > 1) {
            LocalDate date = parseDate(row[1].trim());
            entry.setTransactionDate(date);
        }
        if (row.length > 2) {
            BigDecimal amount = parseAmount(row[2].trim());
            entry.setAmount(amount);
        }
        if (row.length > 3) {
            entry.setReference(row[3].trim());
        }

        return entry;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isEmpty()) return LocalDate.now();
        String[] patterns = {"yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "MM-dd-yyyy", "dd-MM-yyyy"};
        for (String pattern : patterns) {
            try {
                return LocalDate.parse(value, DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException ignored) {
            }
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            return LocalDate.now();
        }
    }

    private BigDecimal parseAmount(String value) {
        if (value == null || value.isEmpty()) return BigDecimal.ZERO;
        String cleaned = value.replaceAll("[^\\d.,-]", "");
        if (cleaned.contains(",") && cleaned.contains(".")) {
            if (cleaned.lastIndexOf('.') > cleaned.lastIndexOf(',')) {
                cleaned = cleaned.replace(",", "");
            } else {
                cleaned = cleaned.replace(".", "").replace(",", ".");
            }
        } else if (cleaned.contains(",")) {
            cleaned = cleaned.replace(",", ".");
        }
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private List<String[]> parseFile(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename != null && (filename.endsWith(".xlsx") || filename.endsWith(".xls"))) {
            return parseXlsx(file);
        }
        return parseCsv(file);
    }

    private List<String[]> parseCsv(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                rows.add(line.split(","));
            }
        }
        return rows;
    }

    private List<String[]> parseXlsx(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (Row row : sheet) {
                String[] rowData = new String[row.getLastCellNum()];
                for (int i = 0; i < row.getLastCellNum(); i++) {
                    Cell cell = row.getCell(i);
                    rowData[i] = cell != null ? getCellValue(cell) : "";
                }
                rows.add(rowData);
            }
        }
        return rows;
    }

    private String getCellValue(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val) && !Double.isInfinite(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield String.valueOf(cell.getNumericCellValue());
                } catch (Exception e) {
                    try {
                        yield cell.getStringCellValue();
                    } catch (Exception e2) {
                        yield "";
                    }
                }
            }
            default -> "";
        };
    }

    private ReconciliationResponse toResponse(Reconciliation reconciliation) {
        return ReconciliationResponse.builder()
                .id(reconciliation.getId())
                .title(reconciliation.getTitle())
                .status(reconciliation.getStatus())
                .totalBankTransactions(reconciliation.getTotalBankTransactions())
                .totalAccountingTransactions(reconciliation.getTotalAccountingTransactions())
                .matchedCount(reconciliation.getMatchedCount())
                .unmatchedCount(reconciliation.getUnmatchedCount())
                .needsReviewCount(reconciliation.getNeedsReviewCount())
                .discrepancyAmount(reconciliation.getDiscrepancyAmount())
                .periodStart(reconciliation.getPeriodStart())
                .periodEnd(reconciliation.getPeriodEnd())
                .createdAt(reconciliation.getCreatedAt())
                .build();
    }

    private ReconciliationEntryResponse toEntryResponse(ReconciliationEntry entry) {
        return ReconciliationEntryResponse.builder()
                .id(entry.getId())
                .source(entry.getSource())
                .transactionDate(entry.getTransactionDate())
                .description(entry.getDescription())
                .amount(entry.getAmount())
                .reference(entry.getReference())
                .matchedEntryId(entry.getMatchedEntryId())
                .matchStatus(entry.getMatchStatus())
                .matchScore(entry.getMatchScore())
                .amountDifference(entry.getAmountDifference())
                .dateDifferenceDays(entry.getDateDifferenceDays())
                .build();
    }
}
