package com.finlyhub.report.dto;

import com.finlyhub.report.entity.Report.ReportSubtype;
import com.finlyhub.report.entity.Report.ReportType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    @NotNull
    private ReportType type;

    @NotNull
    private ReportSubtype subtype;

    private LocalDate periodStart;

    private LocalDate periodEnd;

    private Map<String, String> parameters;
}
