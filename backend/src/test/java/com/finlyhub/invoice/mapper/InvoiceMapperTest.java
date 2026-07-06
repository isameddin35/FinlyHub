package com.finlyhub.invoice.mapper;

import com.finlyhub.invoice.dto.InvoiceResponse;
import com.finlyhub.invoice.entity.Invoice;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class InvoiceMapperTest {

    private final InvoiceMapper mapper = new InvoiceMapper();

    @Test
    void toResponse_MapsAllFieldsCorrectly() {
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setInvoiceNumber("INV-001");
        invoice.setVendorName("Acme Corp");
        invoice.setVendorEmail("billing@acme.com");
        invoice.setVendorAddress("123 Main St");
        invoice.setInvoiceDate(LocalDate.of(2026, 1, 15));
        invoice.setDueDate(LocalDate.of(2026, 2, 15));
        invoice.setCurrency("USD");
        invoice.setSubtotal(new BigDecimal("1000.00"));
        invoice.setTaxAmount(new BigDecimal("100.00"));
        invoice.setVatAmount(new BigDecimal("20.00"));
        invoice.setDiscountAmount(new BigDecimal("50.00"));
        invoice.setTotalAmount(new BigDecimal("1070.00"));
        invoice.setStatus(Invoice.Status.APPROVED);
        invoice.setConfidenceScore(0.95);
        invoice.setProcessingTimeMs(1500L);
        invoice.setApprovedBy(42L);
        invoice.setApprovedAt(LocalDateTime.of(2026, 1, 16, 10, 0));
        invoice.setCreatedAt(LocalDateTime.of(2026, 1, 15, 8, 0));
        invoice.setUpdatedAt(LocalDateTime.of(2026, 1, 16, 10, 0));

        InvoiceResponse response = mapper.toResponse(invoice);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getInvoiceNumber()).isEqualTo("INV-001");
        assertThat(response.getVendorName()).isEqualTo("Acme Corp");
        assertThat(response.getVendorEmail()).isEqualTo("billing@acme.com");
        assertThat(response.getVendorAddress()).isEqualTo("123 Main St");
        assertThat(response.getInvoiceDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(response.getDueDate()).isEqualTo(LocalDate.of(2026, 2, 15));
        assertThat(response.getCurrency()).isEqualTo("USD");
        assertThat(response.getSubtotal()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(response.getTaxAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(response.getVatAmount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(response.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("1070.00"));
        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(response.getConfidenceScore()).isEqualTo(0.95);
        assertThat(response.getProcessingTimeMs()).isEqualTo(1500L);
        assertThat(response.getApprovedBy()).isEqualTo("42");
        assertThat(response.getApprovedAt()).isNotNull();
        assertThat(response.getCreatedAt()).isNotNull();
        assertThat(response.getUpdatedAt()).isNotNull();
    }

    @Test
    void toResponse_WithNullApprovedBy_ReturnsNull() {
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setStatus(Invoice.Status.PENDING);
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());

        InvoiceResponse response = mapper.toResponse(invoice);

        assertThat(response.getApprovedBy()).isNull();
    }

    @Test
    void toResponse_WithNullDates_ReturnsNull() {
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setStatus(Invoice.Status.PENDING);
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());

        InvoiceResponse response = mapper.toResponse(invoice);

        assertThat(response.getInvoiceDate()).isNull();
        assertThat(response.getDueDate()).isNull();
        assertThat(response.getApprovedAt()).isNull();
    }

    @Test
    void toResponse_WithExtractionId_SetsExtractionId() {
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setStatus(Invoice.Status.PENDING);
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());

        InvoiceResponse response = mapper.toResponse(invoice, 100L);

        assertThat(response.getExtractionId()).isEqualTo(100L);
    }

    @Test
    void toResponse_MapsStatusToString() {
        Invoice invoice = new Invoice();
        invoice.setId(1L);
        invoice.setStatus(Invoice.Status.PROCESSING);
        invoice.setCreatedAt(LocalDateTime.now());
        invoice.setUpdatedAt(LocalDateTime.now());

        InvoiceResponse response = mapper.toResponse(invoice);

        assertThat(response.getStatus()).isEqualTo("PROCESSING");
    }
}
