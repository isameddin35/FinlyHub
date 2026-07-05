package com.finlyhub.transaction.mapper;

import com.finlyhub.transaction.dto.TransactionCategoryResponse;
import com.finlyhub.transaction.dto.TransactionResponse;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.TransactionCategory;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .userId(transaction.getUser().getId())
                .categoryId(transaction.getCategory() != null ? transaction.getCategory().getId() : null)
                .categoryName(transaction.getCategory() != null ? transaction.getCategory().getName() : null)
                .suggestedCategoryId(transaction.getSuggestedCategory() != null ? transaction.getSuggestedCategory().getId() : null)
                .suggestedCategoryName(transaction.getSuggestedCategory() != null ? transaction.getSuggestedCategory().getName() : null)
                .transactionDate(transaction.getTransactionDate())
                .description(transaction.getDescription())
                .amount(transaction.getAmount())
                .currency(transaction.getCurrency())
                .reference(transaction.getReference())
                .vendor(transaction.getVendor())
                .source(transaction.getSource())
                .confidenceScore(transaction.getConfidenceScore())
                .categorizationStatus(transaction.getCategorizationStatus())
                .userApproved(transaction.getUserApproved())
                .approvedAt(transaction.getApprovedAt())
                .importBatchId(transaction.getImportBatchId())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }

    public TransactionCategoryResponse toCategoryResponse(TransactionCategory category) {
        return TransactionCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .icon(category.getIcon())
                .color(category.getColor())
                .build();
    }
}
