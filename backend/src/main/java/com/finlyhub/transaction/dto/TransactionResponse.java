package com.finlyhub.transaction.dto;

import com.finlyhub.transaction.entity.Transaction.CategorizationStatus;
import com.finlyhub.transaction.entity.Transaction.TransactionSource;
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
public class TransactionResponse {

    private Long id;
    private Long userId;
    private Long categoryId;
    private String categoryName;
    private Long suggestedCategoryId;
    private String suggestedCategoryName;
    private LocalDate transactionDate;
    private String description;
    private BigDecimal amount;
    private String currency;
    private String reference;
    private String vendor;
    private TransactionSource source;
    private Double confidenceScore;
    private CategorizationStatus categorizationStatus;
    private Boolean userApproved;
    private LocalDateTime approvedAt;
    private String importBatchId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
