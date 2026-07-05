package com.finlyhub.transaction.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.transaction.dto.*;
import com.finlyhub.transaction.entity.TransactionCategory;
import com.finlyhub.transaction.mapper.TransactionMapper;
import com.finlyhub.transaction.repository.TransactionCategoryRepository;
import com.finlyhub.transaction.service.TransactionCategorizationService;
import com.finlyhub.transaction.service.TransactionImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionImportService importService;
    private final TransactionCategorizationService categorizationService;
    private final TransactionCategoryRepository categoryRepository;
    private final TransactionMapper transactionMapper;

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<TransactionUploadResponse>> importFile(
            @RequestParam("file") MultipartFile file) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not authenticated"));
        }

        String filename = file.getOriginalFilename();
        TransactionUploadResponse response;

        if (filename != null && (filename.endsWith(".xlsx") || filename.endsWith(".xls"))) {
            response = importService.importXlsx(file, userId);
        } else {
            response = importService.importCsv(file, userId);
        }

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getTransactions() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not authenticated"));
        }

        List<TransactionResponse> transactions = categorizationService.getTransactionsByUser(userId);
        return ResponseEntity.ok(ApiResponse.success(transactions));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<TransactionResponse>>> getPendingTransactions() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not authenticated"));
        }

        List<TransactionResponse> transactions = categorizationService.getPendingTransactions(userId);
        return ResponseEntity.ok(ApiResponse.success(transactions));
    }

    @PostMapping("/{id}/categorize")
    public ResponseEntity<ApiResponse<TransactionResponse>> categorizeTransaction(
            @PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not authenticated"));
        }

        TransactionResponse response = categorizationService.categorizeTransaction(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Transaction categorized", response));
    }

    @PostMapping("/batch/{batchId}/categorize")
    public ResponseEntity<ApiResponse<TransactionImportResponse>> categorizeBatch(
            @PathVariable String batchId) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not authenticated"));
        }

        TransactionImportResponse response = categorizationService.categorizeBatch(batchId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<TransactionResponse>> approveCategory(
            @PathVariable Long id,
            @RequestBody TransactionCategorizeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("User not authenticated"));
        }

        TransactionResponse response;
        if (request.getCategoryId() != null) {
            response = categorizationService.approveCategory(id, request.getCategoryId(), userId);
        } else {
            response = categorizationService.rejectSuggestion(id, userId);
        }

        return ResponseEntity.ok(ApiResponse.success("Category updated", response));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<TransactionCategoryResponse>>> getCategories() {
        List<TransactionCategory> categories = categoryRepository.findAll();
        List<TransactionCategoryResponse> response = categories.stream()
                .map(transactionMapper::toCategoryResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
