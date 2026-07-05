package com.finlyhub.transaction.service;

import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.CategorizationResult;
import com.finlyhub.common.service.AiService;
import com.finlyhub.transaction.dto.TransactionImportResponse;
import com.finlyhub.transaction.dto.TransactionResponse;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.Transaction.CategorizationStatus;
import com.finlyhub.transaction.entity.TransactionCategory;
import com.finlyhub.transaction.mapper.TransactionMapper;
import com.finlyhub.transaction.repository.TransactionCategoryRepository;
import com.finlyhub.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionCategorizationService {

    private final TransactionRepository transactionRepository;
    private final TransactionCategoryRepository categoryRepository;
    private final AiService aiService;
    private final TransactionMapper transactionMapper;

    @Transactional
    public TransactionResponse categorizeTransaction(Long transactionId, Long userId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Transaction", transactionId);
        }

        CategorizationResult result = aiService.categorizeTransaction(
                transaction.getDescription(),
                transaction.getAmount().doubleValue()
        );

        if (result.getCategoryName() != null) {
            TransactionCategory matchedCategory = categoryRepository.findByName(result.getCategoryName())
                    .orElse(null);
            transaction.setSuggestedCategory(matchedCategory);
        }

        transaction.setSuggestedCategoryId(result.getCategoryId());
        transaction.setConfidenceScore(result.getConfidenceScore());

        transactionRepository.save(transaction);

        return transactionMapper.toResponse(transaction);
    }

    @Transactional
    public TransactionImportResponse categorizeBatch(String importBatchId, Long userId) {
        List<Transaction> transactions = transactionRepository.findByImportBatchId(importBatchId);

        int total = transactions.size();
        int categorized = 0;
        int failed = 0;

        for (Transaction transaction : transactions) {
            if (transaction.getCategorizationStatus() != CategorizationStatus.PENDING) continue;
            if (!transaction.getUser().getId().equals(userId)) continue;

            try {
                CategorizationResult result = aiService.categorizeTransaction(
                        transaction.getDescription(),
                        transaction.getAmount().doubleValue()
                );

                if (result.getCategoryName() != null) {
                    TransactionCategory matchedCategory = categoryRepository.findByName(result.getCategoryName())
                            .orElse(null);
                    transaction.setSuggestedCategory(matchedCategory);
                }

                transaction.setSuggestedCategoryId(result.getCategoryId());
                transaction.setConfidenceScore(result.getConfidenceScore());
                transactionRepository.save(transaction);
                categorized++;
            } catch (Exception e) {
                failed++;
            }
        }

        return TransactionImportResponse.builder()
                .totalImported(total)
                .categorized(categorized)
                .failed(failed)
                .build();
    }

    @Transactional
    public TransactionResponse approveCategory(Long transactionId, Long categoryId, Long userId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Transaction", transactionId);
        }

        TransactionCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("TransactionCategory", categoryId));

        transaction.setCategory(category);
        transaction.setCategorizationStatus(CategorizationStatus.APPROVED);
        transaction.setUserApproved(true);
        transaction.setApprovedAt(LocalDateTime.now());

        transactionRepository.save(transaction);

        return transactionMapper.toResponse(transaction);
    }

    @Transactional
    public TransactionResponse rejectSuggestion(Long transactionId, Long userId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Transaction", transactionId);
        }

        transaction.setCategorizationStatus(CategorizationStatus.REJECTED);
        transactionRepository.save(transaction);

        return transactionMapper.toResponse(transaction);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByUser(Long userId) {
        return transactionRepository.findByUserIdOrderByTransactionDateDesc(userId)
                .stream()
                .map(transactionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getPendingTransactions(Long userId) {
        return transactionRepository.findByUserIdAndCategorizationStatus(userId, CategorizationStatus.PENDING)
                .stream()
                .map(transactionMapper::toResponse)
                .toList();
    }
}
