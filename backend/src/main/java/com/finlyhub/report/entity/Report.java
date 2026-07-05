package com.finlyhub.report.entity;

import com.finlyhub.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
public class Report {

    public enum ReportType {
        REVENUE, EXPENSE, PROFIT, CASHFLOW
    }

    public enum ReportSubtype {
        MONTHLY, QUARTERLY, ANNUAL, CATEGORY, VENDOR, DEPARTMENT
    }

    public enum ReportStatus {
        PENDING, GENERATING, COMPLETED, FAILED
    }

    public enum ExportFormat {
        PDF, EXCEL, NONE
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
    private ReportType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportSubtype subtype;

    @Column(columnDefinition = "TEXT")
    private String parameters;

    @Column(columnDefinition = "TEXT")
    private String data;

    @Column(name = "ai_insights", columnDefinition = "TEXT")
    private String aiInsights;

    @Column(name = "chart_config", columnDefinition = "TEXT")
    private String chartConfig;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "export_format", nullable = false, length = 10)
    private ExportFormat exportFormat;

    @Column(name = "export_path", length = 500)
    private String exportPath;

    @Column(name = "period_start")
    private LocalDate periodStart;

    @Column(name = "period_end")
    private LocalDate periodEnd;

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
