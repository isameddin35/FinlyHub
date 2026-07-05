package com.finlyhub.report.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.report.dto.ReportRequest;
import com.finlyhub.report.dto.ReportResponse;
import com.finlyhub.report.dto.ReportSummaryResponse;
import com.finlyhub.report.service.ReportGeneratorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportGeneratorService reportService;

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ReportResponse>> generateReport(@Valid @RequestBody ReportRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        ReportResponse response = reportService.generateReport(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Report generated successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportSummaryResponse>>> getReports() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ReportSummaryResponse> reports = reportService.getReportsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReportResponse>> getReport(@PathVariable Long id) {
        ReportResponse response = reportService.getReportById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable Long id,
            @RequestParam(defaultValue = "PDF") String format) {
        byte[] data = reportService.exportReport(id, format);
        String filename = "report_" + id + "." + format.toLowerCase();
        MediaType mediaType = "PDF".equalsIgnoreCase(format)
                ? MediaType.APPLICATION_PDF
                : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(data);
    }
}
