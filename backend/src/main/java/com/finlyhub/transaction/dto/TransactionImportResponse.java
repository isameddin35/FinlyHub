package com.finlyhub.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionImportResponse {

    private int totalImported;
    private int categorized;
    private int failed;
}
