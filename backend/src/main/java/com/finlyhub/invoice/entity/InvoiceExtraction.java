package com.finlyhub.invoice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "invoice_extractions")
@Getter
@Setter
@NoArgsConstructor
public class InvoiceExtraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Stage stage;

    @Column(name = "raw_ocr_text", columnDefinition = "TEXT")
    private String rawOcrText;

    @Column(name = "extracted_data", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String extractedData;

    @Column(name = "confidence_scores", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String confidenceScores;

    @Column(name = "corrected_data", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String correctedData;

    @Column(name = "correction_notes")
    private String correctionNotes;

    @Column(name = "llm_prompt", columnDefinition = "TEXT")
    private String llmPrompt;

    @Column(name = "llm_response", columnDefinition = "TEXT")
    private String llmResponse;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Stage {
        OCR, LLM, HUMAN_REVIEW
    }
}
