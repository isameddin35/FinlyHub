package com.finlyhub.reconciliation.entity;

import com.finlyhub.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliations")
@Getter
@Setter
@NoArgsConstructor
public class Reconciliation {

    public enum ReconciliationStatus {
        IN_PROGRESS, COMPLETED, APPROVED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReconciliationStatus status;

    @Column(name = "bank_statement_path", length = 500)
    private String bankStatementPath;

    @Column(name = "accounting_data_path", length = 500)
    private String accountingDataPath;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

    @Column(name = "total_bank_transactions")
    private int totalBankTransactions;

    @Column(name = "total_accounting_transactions")
    private int totalAccountingTransactions;

    @Column(name = "matched_count")
    private int matchedCount;

    @Column(name = "unmatched_count")
    private int unmatchedCount;

    @Column(name = "needs_review_count")
    private int needsReviewCount;

    @Column(name = "discrepancy_amount", precision = 19, scale = 2)
    private BigDecimal discrepancyAmount;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

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
}
