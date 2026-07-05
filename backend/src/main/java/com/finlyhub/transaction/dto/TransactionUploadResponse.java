package com.finlyhub.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionUploadResponse {

    private String batchId;
    private int totalCount;
    private String message;
}
