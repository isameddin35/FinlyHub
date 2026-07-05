package com.finlyhub.reconciliation.dto;

import com.finlyhub.reconciliation.entity.Reconciliation.ReconciliationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationUploadResponse {

    private Long id;

    private String title;

    private ReconciliationStatus status;

    private int totalBank;

    private int totalAccounting;
}
