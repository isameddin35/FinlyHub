package com.finlyhub.report.dto;

import com.finlyhub.report.entity.Report.ReportStatus;
import com.finlyhub.report.entity.Report.ReportSubtype;
import com.finlyhub.report.entity.Report.ReportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummaryResponse {

    private Long id;

    private String title;

    private ReportType type;

    private ReportSubtype subtype;

    private ReportStatus status;

    private LocalDate periodStart;

    private LocalDate periodEnd;

    private LocalDateTime createdAt;
}
