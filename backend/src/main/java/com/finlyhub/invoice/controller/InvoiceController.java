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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
}
