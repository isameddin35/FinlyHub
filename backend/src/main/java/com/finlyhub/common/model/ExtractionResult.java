package com.finlyhub.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractionResult {

    private String invoiceNumber;
    private String vendor;
    private String vendorEmail;
    private String vendorAddress;
    private String date;
    private String dueDate;
    private Double subtotal;
    private Double tax;
    private Double vat;
    private Double total;
    private String currency;
    private Double confidence;
    private Map<String, Double> fieldConfidence;
    private String rawResponse;
}
