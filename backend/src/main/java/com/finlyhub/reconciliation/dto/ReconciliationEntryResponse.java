package com.finlyhub.reconciliation.dto;

import com.finlyhub.reconciliation.entity.ReconciliationEntry.MatchStatus;
import com.finlyhub.reconciliation.entity.ReconciliationEntry.Source;
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
public class ReconciliationEntryResponse {

    private Long id;

    private Source source;

    private LocalDate transactionDate;

    private String description;

    private BigDecimal amount;

    private String reference;

    private Long matchedEntryId;

    private MatchStatus matchStatus;

    private BigDecimal matchScore;

    private BigDecimal amountDifference;

    private Integer dateDifferenceDays;
}
