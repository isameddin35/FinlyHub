package com.finlyhub.transaction.service;

import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.model.CategorizationResult;
import com.finlyhub.common.service.AiService;
import com.finlyhub.transaction.dto.TransactionImportResponse;
import com.finlyhub.transaction.dto.TransactionResponse;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.TransactionCategory;
import com.finlyhub.transaction.mapper.TransactionMapper;
import com.finlyhub.transaction.repository.TransactionCategoryRepository;
import com.finlyhub.transaction.repository.TransactionRepository;
import com.finlyhub.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionCategorizationServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private TransactionCategoryRepository categoryRepository;
    @Mock private AiService aiService;
    @Mock private TransactionMapper transactionMapper;

    private TransactionCategorizationService service;

    @BeforeEach
    void setUp() {
        service = new TransactionCategorizationService(transactionRepository, categoryRepository,
                aiService, transactionMapper);
    }

    @Test
    void categorizeTransaction_Success_CategorizesAndReturnsResponse() {
        User user = new User();
        user.setId(1L);

        Transaction transaction = new Transaction();
        transaction.setId(100L);
        transaction.setUser(user);
        transaction.setDescription("Office supplies purchase");
        transaction.setAmount(new BigDecimal("-150.00"));
        transaction.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);

        CategorizationResult result = new CategorizationResult();
        result.setCategoryName("Office Supplies");
        result.setCategoryId(10L);
        result.setConfidenceScore(0.95);

        TransactionCategory category = new TransactionCategory();
        category.setId(10L);
        category.setName("Office Supplies");

        TransactionResponse expectedResponse = new TransactionResponse();

        when(transactionRepository.findById(100L)).thenReturn(Optional.of(transaction));
        when(aiService.categorizeTransaction("Office supplies purchase", -150.0)).thenReturn(result);
        when(categoryRepository.findByName("Office Supplies")).thenReturn(Optional.of(category));
        when(transactionMapper.toResponse(transaction)).thenReturn(expectedResponse);

        TransactionResponse response = service.categorizeTransaction(100L, 1L);

        assertThat(response).isEqualTo(expectedResponse);
        verify(transactionRepository).save(transaction);
        assertThat(transaction.getSuggestedCategory()).isEqualTo(category);
        assertThat(transaction.getSuggestedCategoryId()).isEqualTo(10L);
        assertThat(transaction.getConfidenceScore()).isEqualTo(0.95);
    }

    @Test
    void categorizeTransaction_TransactionNotFound_ThrowsResourceNotFoundException() {
        when(transactionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.categorizeTransaction(999L, 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void categorizeTransaction_UserIdMismatch_ThrowsResourceNotFoundException() {
        User user = new User();
        user.setId(2L);

        Transaction transaction = new Transaction();
        transaction.setId(100L);
        transaction.setUser(user);

        when(transactionRepository.findById(100L)).thenReturn(Optional.of(transaction));

        assertThatThrownBy(() -> service.categorizeTransaction(100L, 1L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("100");
    }

    @Test
    void categorizeTransaction_WithNullCategoryName_SetsCategoryIdOnly() {
        User user = new User();
        user.setId(1L);

        Transaction transaction = new Transaction();
        transaction.setId(200L);
        transaction.setUser(user);
        transaction.setDescription("Coffee");
        transaction.setAmount(new BigDecimal("-5.00"));
        transaction.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);

        CategorizationResult result = new CategorizationResult();
        result.setCategoryName(null);
        result.setCategoryId(99L);
        result.setConfidenceScore(0.8);

        TransactionResponse expectedResponse = new TransactionResponse();

        when(transactionRepository.findById(200L)).thenReturn(Optional.of(transaction));
        when(aiService.categorizeTransaction("Coffee", -5.0)).thenReturn(result);
        when(transactionMapper.toResponse(transaction)).thenReturn(expectedResponse);

        service.categorizeTransaction(200L, 1L);

        assertThat(transaction.getSuggestedCategory()).isNull();
        assertThat(transaction.getSuggestedCategoryId()).isEqualTo(99L);
        verify(transactionRepository).save(transaction);
    }

    @Test
    void approveCategory_Success_ApprovesAndReturnsResponse() {
        User user = new User();
        user.setId(1L);

        Transaction transaction = new Transaction();
        transaction.setId(100L);
        transaction.setUser(user);
        transaction.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);

        TransactionCategory category = new TransactionCategory();
        category.setId(5L);
        category.setName("Travel");

        TransactionResponse expectedResponse = new TransactionResponse();

        when(transactionRepository.findById(100L)).thenReturn(Optional.of(transaction));
        when(categoryRepository.findById(5L)).thenReturn(Optional.of(category));
        when(transactionMapper.toResponse(transaction)).thenReturn(expectedResponse);

        TransactionResponse response = service.approveCategory(100L, 5L, 1L);

        assertThat(response).isEqualTo(expectedResponse);
        assertThat(transaction.getCategory()).isEqualTo(category);
        assertThat(transaction.getCategorizationStatus()).isEqualTo(Transaction.CategorizationStatus.APPROVED);
        assertThat(transaction.getUserApproved()).isTrue();
        assertThat(transaction.getApprovedAt()).isNotNull();
    }

    @Test
    void rejectSuggestion_Success_RejectsTransaction() {
        User user = new User();
        user.setId(1L);

        Transaction transaction = new Transaction();
        transaction.setId(100L);
        transaction.setUser(user);
        transaction.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);

        TransactionResponse expectedResponse = new TransactionResponse();

        when(transactionRepository.findById(100L)).thenReturn(Optional.of(transaction));
        when(transactionMapper.toResponse(transaction)).thenReturn(expectedResponse);

        TransactionResponse response = service.rejectSuggestion(100L, 1L);

        assertThat(response).isEqualTo(expectedResponse);
        assertThat(transaction.getCategorizationStatus()).isEqualTo(Transaction.CategorizationStatus.REJECTED);
    }

    @Test
    void categorizeBatch_WithMixedStatus_ReturnsCorrectCounts() {
        User user = new User();
        user.setId(1L);

        Transaction pending1 = new Transaction();
        pending1.setId(1L);
        pending1.setUser(user);
        pending1.setDescription("Item 1");
        pending1.setAmount(new BigDecimal("-10.00"));
        pending1.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);

        Transaction pending2 = new Transaction();
        pending2.setId(2L);
        pending2.setUser(user);
        pending2.setDescription("Item 2");
        pending2.setAmount(new BigDecimal("-20.00"));
        pending2.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);

        Transaction alreadyApproved = new Transaction();
        alreadyApproved.setId(3L);
        alreadyApproved.setUser(user);
        alreadyApproved.setDescription("Item 3");
        alreadyApproved.setAmount(new BigDecimal("-30.00"));
        alreadyApproved.setCategorizationStatus(Transaction.CategorizationStatus.APPROVED);

        when(transactionRepository.findByImportBatchId("batch-1"))
                .thenReturn(List.of(pending1, pending2, alreadyApproved));

        CategorizationResult result = new CategorizationResult();
        result.setCategoryName("Software");
        result.setCategoryId(10L);
        result.setConfidenceScore(0.9);

        when(aiService.categorizeTransaction(anyString(), anyDouble())).thenReturn(result);

        TransactionImportResponse response = service.categorizeBatch("batch-1", 1L);

        assertThat(response.getTotalImported()).isEqualTo(3);
        assertThat(response.getCategorized()).isEqualTo(2);
        assertThat(response.getFailed()).isZero();
    }
}
