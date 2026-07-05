package com.finlyhub.reconciliation.dto;

import com.finlyhub.reconciliation.entity.Reconciliation.ReconciliationStatus;
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
public class ReconciliationResponse {

    private Long id;

    private String title;

    private ReconciliationStatus status;

    private int totalBankTransactions;

    private int totalAccountingTransactions;

    private int matchedCount;

    private int unmatchedCount;

    private int needsReviewCount;

    private BigDecimal discrepancyAmount;

    private LocalDate periodStart;

    private LocalDate periodEnd;

    private LocalDateTime createdAt;
}
