package com.finlyhub.transaction.mapper;

import com.finlyhub.transaction.dto.TransactionCategoryResponse;
import com.finlyhub.transaction.dto.TransactionResponse;
import com.finlyhub.transaction.entity.Transaction;
import com.finlyhub.transaction.entity.TransactionCategory;
import com.finlyhub.user.entity.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionMapperTest {

    private final TransactionMapper mapper = new TransactionMapper();

    @Test
    void toResponse_MapsAllTransactionFieldsCorrectly() {
        User user = new User();
        user.setId(1L);

        TransactionCategory category = new TransactionCategory();
        category.setId(10L);
        category.setName("Office Supplies");

        TransactionCategory suggested = new TransactionCategory();
        suggested.setId(20L);
        suggested.setName("Software");

        Transaction transaction = new Transaction();
        transaction.setId(100L);
        transaction.setUser(user);
        transaction.setCategory(category);
        transaction.setSuggestedCategory(suggested);
        transaction.setTransactionDate(LocalDate.of(2026, 1, 15));
        transaction.setDescription("Adobe Creative Cloud subscription");
        transaction.setAmount(new BigDecimal("-59.99"));
        transaction.setCurrency("USD");
        transaction.setReference("REF-001");
        transaction.setVendor("Adobe Inc");
        transaction.setSource(Transaction.TransactionSource.CSV);
        transaction.setConfidenceScore(0.92);
        transaction.setCategorizationStatus(Transaction.CategorizationStatus.APPROVED);
        transaction.setUserApproved(true);
        transaction.setApprovedAt(LocalDateTime.of(2026, 1, 16, 10, 0));
        transaction.setImportBatchId("batch-1");
        transaction.setCreatedAt(LocalDateTime.of(2026, 1, 15, 8, 0));
        transaction.setUpdatedAt(LocalDateTime.of(2026, 1, 16, 10, 0));

        TransactionResponse response = mapper.toResponse(transaction);

        assertThat(response.getId()).isEqualTo(100L);
        assertThat(response.getUserId()).isEqualTo(1L);
        assertThat(response.getCategoryId()).isEqualTo(10L);
        assertThat(response.getCategoryName()).isEqualTo("Office Supplies");
        assertThat(response.getSuggestedCategoryId()).isEqualTo(20L);
        assertThat(response.getSuggestedCategoryName()).isEqualTo("Software");
        assertThat(response.getTransactionDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(response.getDescription()).isEqualTo("Adobe Creative Cloud subscription");
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("-59.99"));
        assertThat(response.getCurrency()).isEqualTo("USD");
        assertThat(response.getReference()).isEqualTo("REF-001");
        assertThat(response.getVendor()).isEqualTo("Adobe Inc");
        assertThat(response.getSource()).isEqualTo(Transaction.TransactionSource.CSV);
        assertThat(response.getConfidenceScore()).isEqualTo(0.92);
        assertThat(response.getCategorizationStatus()).isEqualTo(Transaction.CategorizationStatus.APPROVED);
        assertThat(response.getUserApproved()).isTrue();
        assertThat(response.getImportBatchId()).isEqualTo("batch-1");
    }

    @Test
    void toResponse_HandlesNullCategory() {
        User user = new User();
        user.setId(1L);

        Transaction transaction = new Transaction();
        transaction.setId(101L);
        transaction.setUser(user);
        transaction.setTransactionDate(LocalDate.now());
        transaction.setDescription("Test");
        transaction.setAmount(BigDecimal.TEN);
        transaction.setCurrency("USD");
        transaction.setSource(Transaction.TransactionSource.MANUAL);
        transaction.setCategorizationStatus(Transaction.CategorizationStatus.PENDING);
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setUpdatedAt(LocalDateTime.now());

        TransactionResponse response = mapper.toResponse(transaction);

        assertThat(response.getCategoryId()).isNull();
        assertThat(response.getCategoryName()).isNull();
        assertThat(response.getSuggestedCategoryId()).isNull();
        assertThat(response.getSuggestedCategoryName()).isNull();
    }

    @Test
    void toCategoryResponse_MapsAllCategoryFieldsCorrectly() {
        TransactionCategory category = new TransactionCategory();
        category.setId(1L);
        category.setName("Travel");
        category.setDescription("Business travel expenses");
        category.setIcon("plane");
        category.setColor("#ff0000");

        TransactionCategoryResponse response = mapper.toCategoryResponse(category);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Travel");
        assertThat(response.getDescription()).isEqualTo("Business travel expenses");
        assertThat(response.getIcon()).isEqualTo("plane");
        assertThat(response.getColor()).isEqualTo("#ff0000");
    }
}
