package com.finlyhub.invoice.mapper;

import com.finlyhub.invoice.dto.InvoiceResponse;
import com.finlyhub.invoice.entity.Invoice;
import org.springframework.stereotype.Component;

@Component
public class InvoiceMapper {

    public InvoiceResponse toResponse(Invoice invoice) {
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .vendorName(invoice.getVendorName())
                .vendorEmail(invoice.getVendorEmail())
                .vendorAddress(invoice.getVendorAddress())
                .invoiceDate(invoice.getInvoiceDate())
                .dueDate(invoice.getDueDate())
                .currency(invoice.getCurrency())
                .subtotal(invoice.getSubtotal())
                .taxAmount(invoice.getTaxAmount())
                .vatAmount(invoice.getVatAmount())
                .discountAmount(invoice.getDiscountAmount())
                .totalAmount(invoice.getTotalAmount())
                .status(invoice.getStatus().name())
                .confidenceScore(invoice.getConfidenceScore())
                .processingTimeMs(invoice.getProcessingTimeMs())
                .approvedBy(invoice.getApprovedBy() != null ? String.valueOf(invoice.getApprovedBy()) : null)
                .approvedAt(invoice.getApprovedAt())
                .createdAt(invoice.getCreatedAt())
                .updatedAt(invoice.getUpdatedAt())
                .build();
    }

    public InvoiceResponse toResponse(Invoice invoice, Long extractionId) {
        InvoiceResponse response = toResponse(invoice);
        response.setExtractionId(extractionId);
        return response;
    }
}
