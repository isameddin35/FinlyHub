package com.finlyhub.invoice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceUploadResponse {

    private Long id;
    private String filename;
    private String status;
    private String message;
}
