package com.finlyhub.invoice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceResponse {

    private Long id;
    private String invoiceNumber;
    private String vendorName;
    private String vendorEmail;
    private String vendorAddress;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private String currency;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal vatAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String status;
    private Double confidenceScore;
    private Long processingTimeMs;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long extractionId;
}
