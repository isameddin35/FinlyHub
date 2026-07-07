package com.finlyhub.invoice.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.invoice.dto.InvoiceApprovalRequest;
import com.finlyhub.invoice.dto.InvoiceResponse;
import com.finlyhub.invoice.dto.InvoiceUploadResponse;
import com.finlyhub.invoice.entity.Invoice;
import com.finlyhub.invoice.mapper.InvoiceMapper;
import com.finlyhub.invoice.repository.InvoiceRepository;
import com.finlyhub.invoice.service.InvoiceProcessingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceProcessingService processingService;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceMapper invoiceMapper;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<InvoiceUploadResponse>> uploadInvoice(
            @RequestParam("file") MultipartFile file) {
        Long userId = SecurityUtils.getCurrentUserId();
        InvoiceUploadResponse uploadResponse = processingService.initiateProcessing(file, userId);
        return ResponseEntity.ok(ApiResponse.success("Invoice uploaded, processing in background", uploadResponse));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> getInvoices(Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        Page<InvoiceResponse> invoices = invoiceRepository.findByUserId(userId, pageable)
                .map(invoiceMapper::toResponse);
        return ResponseEntity.ok(ApiResponse.success(invoices));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoice(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
        if (!invoice.getUser().getId().equals(userId)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        }
        return ResponseEntity.ok(ApiResponse.success(invoiceMapper.toResponse(invoice)));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<InvoiceResponse>> approveInvoice(
            @PathVariable Long id,
            @Valid @RequestBody InvoiceApprovalRequest request) {
        InvoiceResponse response = processingService.approveInvoice(id, request);
        return ResponseEntity.ok(ApiResponse.success("Invoice approved", response));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportApprovedInvoices() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<Invoice> invoices = invoiceRepository.findByUserIdAndStatus(userId, Invoice.Status.APPROVED);
        byte[] data = generateApprovedExcel(invoices);
        String filename = "approved_invoices_" + LocalDate.now() + ".xlsx";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }

    private byte[] generateApprovedExcel(List<Invoice> invoices) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Approved Invoices");

            String[] headers = {"Invoice #", "Vendor Name", "Vendor Email", "Invoice Date", "Due Date",
                    "Currency", "Subtotal", "Tax Amount", "VAT Amount", "Discount Amount",
                    "Total Amount", "Confidence", "Approved At"};

            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (int i = 0; i < invoices.size(); i++) {
                Invoice inv = invoices.get(i);
                Row row = sheet.createRow(i + 1);

                row.createCell(0).setCellValue(nonNull(inv.getInvoiceNumber()));
                row.createCell(1).setCellValue(nonNull(inv.getVendorName()));
                row.createCell(2).setCellValue(nonNull(inv.getVendorEmail()));
                row.createCell(3).setCellValue(inv.getInvoiceDate() != null ? inv.getInvoiceDate().format(dateFormatter) : "");
                row.createCell(4).setCellValue(inv.getDueDate() != null ? inv.getDueDate().format(dateFormatter) : "");
                row.createCell(5).setCellValue(nonNull(inv.getCurrency()));
                row.createCell(6).setCellValue(inv.getSubtotal() != null ? inv.getSubtotal().doubleValue() : 0.0);
                row.createCell(7).setCellValue(inv.getTaxAmount() != null ? inv.getTaxAmount().doubleValue() : 0.0);
                row.createCell(8).setCellValue(inv.getVatAmount() != null ? inv.getVatAmount().doubleValue() : 0.0);
                row.createCell(9).setCellValue(inv.getDiscountAmount() != null ? inv.getDiscountAmount().doubleValue() : 0.0);
                row.createCell(10).setCellValue(inv.getTotalAmount() != null ? inv.getTotalAmount().doubleValue() : 0.0);
                row.createCell(11).setCellValue(inv.getConfidenceScore() != null ? inv.getConfidenceScore() : 0.0);
                row.createCell(12).setCellValue(inv.getApprovedAt() != null ? inv.getApprovedAt().format(dateFormatter) : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate Excel export", e);
        }
    }

    private String nonNull(String value) {
        return value != null ? value : "";
    }
}
