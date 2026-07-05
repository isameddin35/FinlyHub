package com.finlyhub.reconciliation.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_entries")
@Getter
@Setter
@NoArgsConstructor
public class ReconciliationEntry {

    public enum Source {
        BANK, ACCOUNTING
    }

    public enum MatchStatus {
        MATCHED, UNMATCHED, NEEDS_REVIEW
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reconciliation_id", nullable = false)
    private Reconciliation reconciliation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Source source;

    @Column(name = "transaction_date")
    private LocalDate transactionDate;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 255)
    private String reference;

    @Column(name = "matched_entry_id")
    private Long matchedEntryId;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_status", length = 20)
    private MatchStatus matchStatus;

    @Column(name = "match_score", precision = 5, scale = 2)
    private BigDecimal matchScore;

    @Column(name = "match_evidence", columnDefinition = "TEXT")
    private String matchEvidence;

    @Column(name = "amount_difference", precision = 19, scale = 2)
    private BigDecimal amountDifference;

    @Column(name = "date_difference_days")
    private Integer dateDifferenceDays;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
