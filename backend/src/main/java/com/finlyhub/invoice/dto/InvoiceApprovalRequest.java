package com.finlyhub.invoice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    private String invoiceNumber;

    @NotBlank
    private String vendorName;

    @NotBlank @Email
    private String vendorEmail;

    private String vendorAddress;
    private LocalDate invoiceDate;
    private LocalDate dueDate;

    @NotBlank
    private String currency;

    @DecimalMin("0.00")
    private BigDecimal subtotal;

    @DecimalMin("0.00")
    private BigDecimal taxAmount;

    @DecimalMin("0.00")
    private BigDecimal vatAmount;

    @DecimalMin("0.00")
    private BigDecimal discountAmount;

    @NotNull @DecimalMin("0.00")
    private BigDecimal totalAmount;
}
