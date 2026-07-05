package com.finlyhub.transaction.entity;

import com.finlyhub.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private TransactionCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suggested_category_id")
    private TransactionCategory suggestedCategory;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "USD";

    @Column(length = 255)
    private String reference;

    @Column(length = 255)
    private String vendor;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private TransactionSource source;

    @Column(name = "suggested_category_id_value")
    private Long suggestedCategoryId;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "categorization_status", nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private CategorizationStatus categorizationStatus = CategorizationStatus.PENDING;

    @Column(name = "user_approved")
    private Boolean userApproved;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", length = 10)
    private TransactionType transactionType;

    @Column(length = 100)
    private String department;

    @Column(name = "import_batch_id", length = 100)
    private String importBatchId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum TransactionSource {
        MANUAL, CSV, XLSX, BANK
    }

    public enum CategorizationStatus {
        PENDING, APPROVED, REJECTED, MANUAL
    }

    public enum TransactionType {
        REVENUE, EXPENSE
    }
}
