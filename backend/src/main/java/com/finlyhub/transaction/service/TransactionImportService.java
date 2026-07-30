package com.finlyhub.transaction.service;

import com.finlyhub.common.exception.BusinessException;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.util.FileParsingUtils;
import com.finlyhub.transaction.dto.TransactionImportResponse;
import com.finlyhub.transaction.dto.TransactionUploadResponse;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.Transaction.TransactionSource;
import com.finlyhub.transaction.repository.TransactionRepository;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionImportService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final TransactionCategorizationService categorizationService;

    public TransactionUploadResponse importCsv(MultipartFile file, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId.toString()));

        String batchId = UUID.randomUUID().toString();
        List<Transaction> transactions = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String header = reader.readLine();
            if (header == null) {
                return TransactionUploadResponse.builder()
                        .batchId(batchId)
                        .totalCount(0)
                        .message("Empty file")
                        .build();
            }

            String[] columns = header.split(",");

            boolean hasReference = false;
            boolean hasVendor = false;
            for (String col : columns) {
                String trimmed = col.trim().toLowerCase();
                if (trimmed.equals("reference")) hasReference = true;
                if (trimmed.equals("vendor")) hasVendor = true;
            }

            DateTimeFormatter[] formatters = {
                    DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                    DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                    DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                    DateTimeFormatter.ofPattern("M/d/yyyy"),
                    DateTimeFormatter.ofPattern("yyyy/MM/dd")
            };

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;

                String[] fields = parseCsvLine(line);

                if (fields.length < 3) continue;

                try {
                    Transaction transaction = new Transaction();
                    transaction.setUser(user);

                    LocalDate date = FileParsingUtils.parseDate(fields[0].trim(), formatters);
                    transaction.setTransactionDate(date != null ? date : LocalDate.now());

                    transaction.setDescription(fields[1].trim());
                    transaction.setAmount(FileParsingUtils.parseAmount(fields[2].trim()));

                    int idx = 3;
                    if (hasReference && fields.length > idx) {
                        transaction.setReference(fields[idx++].trim());
                    }
                    if (hasVendor && fields.length > idx) {
                        transaction.setVendor(fields[idx].trim());
                    }

                    transaction.setSource(TransactionSource.CSV);
                    transaction.setImportBatchId(batchId);

                    transactions.add(transaction);
                } catch (Exception ignored) {
                }
            }
        } catch (IOException e) {
            throw new BusinessException("Failed to parse CSV file");
        }

        transactionRepository.saveAll(transactions);
        categorizationService.categorizeBatch(batchId, userId);

        return TransactionUploadResponse.builder()
                .batchId(batchId)
                .totalCount(transactions.size())
                .message("Imported " + transactions.size() + " transactions")
                .build();
    }

    public TransactionUploadResponse importXlsx(MultipartFile file, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId.toString()));

        String batchId = UUID.randomUUID().toString();
        List<Transaction> transactions = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getPhysicalNumberOfRows() == 0) {
                return TransactionUploadResponse.builder()
                        .batchId(batchId)
                        .totalCount(0)
                        .message("Empty file")
                        .build();
            }

            Row headerRow = sheet.getRow(0);
            boolean hasReference = false;
            boolean hasVendor = false;

            for (int i = 0; i < headerRow.getPhysicalNumberOfCells(); i++) {
                String col = FileParsingUtils.getCellValue(headerRow.getCell(i)).trim().toLowerCase();
                if (col.equals("reference")) hasReference = true;
                if (col.equals("vendor")) hasVendor = true;
            }

            DateTimeFormatter[] formatters = {
                    DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                    DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                    DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                    DateTimeFormatter.ofPattern("M/d/yyyy"),
                    DateTimeFormatter.ofPattern("yyyy/MM/dd")
            };

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    String dateStr = FileParsingUtils.getCellValue(row.getCell(0));
                    String desc = FileParsingUtils.getCellValue(row.getCell(1));
                    String amountStr = FileParsingUtils.getCellValue(row.getCell(2));

                    if (desc.isEmpty() || amountStr.isEmpty()) continue;

                    Transaction transaction = new Transaction();
                    transaction.setUser(user);

                    LocalDate date = FileParsingUtils.parseDate(dateStr, formatters);
                    transaction.setTransactionDate(date != null ? date : LocalDate.now());

                    transaction.setDescription(desc);
                    transaction.setAmount(FileParsingUtils.parseAmount(amountStr));

                    int idx = 3;
                    if (hasReference && row.getPhysicalNumberOfCells() > idx) {
                        transaction.setReference(FileParsingUtils.getCellValue(row.getCell(idx++)));
                    }
                    if (hasVendor && row.getPhysicalNumberOfCells() > idx) {
                        transaction.setVendor(FileParsingUtils.getCellValue(row.getCell(idx)));
                    }

                    transaction.setSource(TransactionSource.XLSX);
                    transaction.setImportBatchId(batchId);

                    transactions.add(transaction);
                } catch (Exception ignored) {
                }
            }
        } catch (IOException e) {
            throw new BusinessException("Failed to parse XLSX file");
        }

        transactionRepository.saveAll(transactions);
        categorizationService.categorizeBatch(batchId, userId);

        return TransactionUploadResponse.builder()
                .batchId(batchId)
                .totalCount(transactions.size())
                .message("Imported " + transactions.size() + " transactions")
                .build();
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder field = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    field.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                fields.add(field.toString());
                field.setLength(0);
            } else {
                field.append(c);
            }
        }
        fields.add(field.toString());

        return fields.toArray(new String[0]);
    }

}
