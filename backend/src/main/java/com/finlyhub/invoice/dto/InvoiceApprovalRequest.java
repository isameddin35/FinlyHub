package com.finlyhub.invoice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceApprovalRequest {

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
}
