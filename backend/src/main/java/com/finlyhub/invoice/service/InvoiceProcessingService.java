package com.finlyhub.invoice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.ExtractionResult;
import com.finlyhub.common.service.AiService;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.invoice.dto.InvoiceApprovalRequest;
import com.finlyhub.invoice.dto.InvoiceResponse;
import com.finlyhub.invoice.dto.InvoiceUploadResponse;
import com.finlyhub.invoice.entity.Document;
import com.finlyhub.invoice.entity.Invoice;
import com.finlyhub.invoice.entity.InvoiceExtraction;
import com.finlyhub.invoice.mapper.InvoiceMapper;
import com.finlyhub.invoice.repository.InvoiceDocumentRepository;
import com.finlyhub.invoice.repository.InvoiceExtractionRepository;
import com.finlyhub.invoice.repository.InvoiceRepository;
import com.finlyhub.user.entity.User;
import com.finlyhub.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class InvoiceProcessingService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceExtractionRepository extractionRepository;
    private final InvoiceDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final OcrService ocrService;
    private final AiService aiService;
    private final InvoiceMapper invoiceMapper;
    private final ObjectMapper objectMapper;

    @Autowired
    @Lazy
    private InvoiceProcessingService self;

    @Value("${app.upload.dir:uploads}/invoices")
    private String uploadDir;

    public InvoiceUploadResponse initiateProcessing(MultipartFile file, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Invoice invoice = new Invoice();
        invoice.setUser(user);
        invoice.setStatus(Invoice.Status.PROCESSING);
        invoice = invoiceRepository.save(invoice);

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        String filePath;
        try {
            Path uploadPath = Path.of(uploadDir);
            Files.createDirectories(uploadPath);
            Path targetPath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            filePath = targetPath.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to save uploaded file", e);
        }

        Document document = new Document();
        document.setFilename(file.getOriginalFilename());
        document.setFilePath(filePath);
        document.setContentType(file.getContentType());
        document.setFileSize(file.getSize());
        document.setUser(user);
        document = documentRepository.save(document);

        invoice.setDocument(document);
        invoice = invoiceRepository.save(invoice);

        Long invoiceId = invoice.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                self.runProcessing(invoiceId, filePath);
            }
        });

        return InvoiceUploadResponse.builder()
                .id(invoice.getId())
                .filename(file.getOriginalFilename())
                .status(Invoice.Status.PROCESSING.name())
                .message("Invoice upload accepted, processing in background")
                .build();
    }

    @Async("invoiceProcessingExecutor")
    public void runProcessing(Long invoiceId, String filePath) {
        Instant start = Instant.now();

        try {
            Invoice invoice = invoiceRepository.findById(invoiceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));

            String ocrText = ocrService.extractText(filePath);

            InvoiceExtraction ocrExtraction = new InvoiceExtraction();
            ocrExtraction.setInvoice(invoice);
            ocrExtraction.setStage(InvoiceExtraction.Stage.OCR);
            ocrExtraction.setRawOcrText(ocrText);
            extractionRepository.save(ocrExtraction);

            ExtractionResult result = aiService.extractInvoiceData(ocrText);

            try {
                InvoiceExtraction llmExtraction = new InvoiceExtraction();
                llmExtraction.setInvoice(invoice);
                llmExtraction.setStage(InvoiceExtraction.Stage.LLM);
                llmExtraction.setExtractedData(objectMapper.writeValueAsString(result));
                llmExtraction.setConfidenceScores(
                        result.getFieldConfidence() != null
                                ? objectMapper.writeValueAsString(result.getFieldConfidence())
                                : null
                );
                llmExtraction.setLlmPrompt("Extract invoice data from OCR text");
                llmExtraction.setLlmResponse(result.getRawResponse());
                extractionRepository.save(llmExtraction);

                invoice.setInvoiceNumber(result.getInvoiceNumber());
                invoice.setVendorName(result.getVendor());

                String vendorEmail = result.getVendorEmail();
                if (vendorEmail == null) vendorEmail = extractEmailFromText(ocrText);
                invoice.setVendorEmail(vendorEmail);

                String vendorAddress = result.getVendorAddress();
                if (vendorAddress == null) vendorAddress = extractAddressFromText(ocrText);
                invoice.setVendorAddress(vendorAddress);

                if (result.getDate() != null) {
                    invoice.setInvoiceDate(parseDateFlexibly(result.getDate()));
                }

                String dueDateStr = result.getDueDate();
                if (dueDateStr == null) dueDateStr = extractDueDateFromText(ocrText);
                if (dueDateStr != null) {
                    invoice.setDueDate(parseDateFlexibly(dueDateStr));
                }
                invoice.setSubtotal(result.getSubtotal() != null ? BigDecimal.valueOf(result.getSubtotal()) : null);
                invoice.setTaxAmount(result.getTax() != null ? BigDecimal.valueOf(result.getTax()) : null);
                invoice.setVatAmount(result.getVat() != null ? BigDecimal.valueOf(result.getVat()) : null);
                invoice.setTotalAmount(result.getTotal() != null ? BigDecimal.valueOf(result.getTotal()) : null);
                invoice.setCurrency(result.getCurrency() != null ? result.getCurrency() : "USD");
                invoice.setConfidenceScore(result.getConfidence());
                invoice.setStatus(Invoice.Status.PENDING);
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize extraction data for invoice {}", invoiceId, e);
                invoice.setStatus(Invoice.Status.REJECTED);
            }

            Instant end = Instant.now();
            invoice.setProcessingTimeMs(Duration.between(start, end).toMillis());
            invoiceRepository.save(invoice);

            log.info("Invoice {} processed in {}ms", invoiceId, invoice.getProcessingTimeMs());
        } catch (Exception e) {
            log.error("Failed to process invoice {}", invoiceId, e);
            try {
                invoiceRepository.findById(invoiceId).ifPresent(inv -> {
                    inv.setStatus(Invoice.Status.REJECTED);
                    invoiceRepository.save(inv);
                });
            } catch (Exception ex) {
                log.error("Failed to mark invoice {} as REJECTED", invoiceId, ex);
            }
        }
    }

    private LocalDate parseDateFlexibly(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        if (dateStr.length() > 10 && dateStr.charAt(10) == 'T') {
            dateStr = dateStr.substring(0, 10);
        }
        DateTimeFormatter[] formats = {
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("MM/dd/yyyy"),
                DateTimeFormatter.ofPattern("M/d/yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy"),
                DateTimeFormatter.ofPattern("MMMM d, yyyy"),
                DateTimeFormatter.ofPattern("MMMM dd, yyyy"),
                DateTimeFormatter.ofPattern("MMM d, yyyy"),
                DateTimeFormatter.ofPattern("MMM dd, yyyy"),
                DateTimeFormatter.ofPattern("d MMMM yyyy"),
                DateTimeFormatter.ofPattern("dd MMMM yyyy"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd"),
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.BASIC_ISO_DATE,
        };
        for (DateTimeFormatter fmt : formats) {
            try {
                return LocalDate.parse(dateStr, fmt);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private String extractEmailFromText(String text) {
        if (text == null || text.isEmpty()) return null;
        Pattern pattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return null;
    }

    private String extractDueDateFromText(String text) {
        if (text == null || text.isEmpty()) return null;
        Pattern pattern = Pattern.compile("(?i)due\\s+date[\\s:]*([A-Za-z0-9\\s,/-]+?)(?:\\n|$|\\.)");
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private String extractAddressFromText(String text) {
        if (text == null || text.isEmpty()) return null;
        Pattern fromPattern = Pattern.compile("(?m)^From:\\s*$");
        Matcher fromMatcher = fromPattern.matcher(text);
        if (!fromMatcher.find()) return null;

        int start = fromMatcher.end();
        Pattern sectionBreak = Pattern.compile("(?m)^(?:Invoice\\s+(?:Number|Date|#)|To:|Bill\\s+To)");
        Matcher breakMatcher = sectionBreak.matcher(text);
        int end = breakMatcher.find(start) ? breakMatcher.start() : text.length();

        String block = text.substring(start, end).trim();
        String[] lines = block.split("\\n");
        StringBuilder address = new StringBuilder();
        boolean skippedFirst = false;
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) break;
            if (!skippedFirst) {
                skippedFirst = true;
                continue;
            }
            if (trimmed.matches(".*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}.*")) break;
            if (address.length() > 0) address.append(", ");
            address.append(trimmed);
        }
        String result = address.toString().trim();
        return result.isEmpty() ? null : result;
    }

    public InvoiceResponse approveInvoice(Long invoiceId, InvoiceApprovalRequest corrections) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));

        InvoiceExtraction latestExtraction = extractionRepository
                .findFirstByInvoiceIdOrderByCreatedAtDesc(invoiceId)
                .orElse(null);

        if (latestExtraction != null) {
            try {
                latestExtraction.setStage(InvoiceExtraction.Stage.HUMAN_REVIEW);
                latestExtraction.setCorrectedData(objectMapper.writeValueAsString(corrections));
                extractionRepository.save(latestExtraction);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to serialize correction data", e);
            }
        }

        if (corrections.getInvoiceNumber() != null) invoice.setInvoiceNumber(corrections.getInvoiceNumber());
        if (corrections.getVendorName() != null) invoice.setVendorName(corrections.getVendorName());
        if (corrections.getVendorEmail() != null) invoice.setVendorEmail(corrections.getVendorEmail());
        if (corrections.getVendorAddress() != null) invoice.setVendorAddress(corrections.getVendorAddress());
        if (corrections.getInvoiceDate() != null) invoice.setInvoiceDate(corrections.getInvoiceDate());
        if (corrections.getDueDate() != null) invoice.setDueDate(corrections.getDueDate());
        if (corrections.getCurrency() != null) invoice.setCurrency(corrections.getCurrency());
        if (corrections.getSubtotal() != null) invoice.setSubtotal(corrections.getSubtotal());
        if (corrections.getTaxAmount() != null) invoice.setTaxAmount(corrections.getTaxAmount());
        if (corrections.getVatAmount() != null) invoice.setVatAmount(corrections.getVatAmount());
        if (corrections.getDiscountAmount() != null) invoice.setDiscountAmount(corrections.getDiscountAmount());
        if (corrections.getTotalAmount() != null) invoice.setTotalAmount(corrections.getTotalAmount());

        User currentUser = SecurityUtils.getCurrentUser();
        invoice.setStatus(Invoice.Status.APPROVED);
        invoice.setApprovedBy(currentUser != null ? currentUser.getId() : null);
        invoice.setApprovedAt(java.time.LocalDateTime.now());
        invoice = invoiceRepository.save(invoice);

        Long extractionId = latestExtraction != null ? latestExtraction.getId() : null;
        return invoiceMapper.toResponse(invoice, extractionId);
    }
}
