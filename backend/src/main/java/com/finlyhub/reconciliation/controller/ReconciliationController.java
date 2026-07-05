package com.finlyhub.reconciliation.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.reconciliation.dto.ReconciliationMatchResponse;
import com.finlyhub.reconciliation.dto.ReconciliationResponse;
import com.finlyhub.reconciliation.dto.ReconciliationUploadResponse;
import com.finlyhub.reconciliation.service.ReconciliationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @PostMapping("/match")
    public ResponseEntity<ApiResponse<ReconciliationUploadResponse>> match(
            @RequestParam("bankFile") MultipartFile bankFile,
            @RequestParam("accountingFile") MultipartFile accountingFile,
            @RequestParam String title,
            @RequestParam(required = false) LocalDate periodStart,
            @RequestParam(required = false) LocalDate periodEnd) throws IOException {
        Long userId = SecurityUtils.getCurrentUserId();
        ReconciliationUploadResponse response = reconciliationService.uploadAndMatch(
                bankFile, accountingFile, title, periodStart, periodEnd, userId);
        return ResponseEntity.ok(ApiResponse.success("Reconciliation completed", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReconciliationResponse>>> getReconciliations() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<ReconciliationResponse> list = reconciliationService.getReconciliations(userId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReconciliationMatchResponse>> getDetail(@PathVariable Long id) {
        ReconciliationMatchResponse response = reconciliationService.getReconciliationDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approve(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        reconciliationService.approveReconciliation(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Reconciliation approved", null));
    }
}
