package com.finlyhub.document.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.document.dto.DocumentChunkResponse;
import com.finlyhub.document.dto.DocumentResponse;
import com.finlyhub.document.dto.DocumentUploadResponse;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.entity.DocumentChunk;
import com.finlyhub.document.mapper.DocumentMapper;
import com.finlyhub.document.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentMapper documentMapper;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<DocumentUploadResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", required = false, defaultValue = "OTHER") String type) {
        Long userId = SecurityUtils.getCurrentUserId();
        Document.DocumentType docType;
        try {
            docType = Document.DocumentType.valueOf(type);
        } catch (IllegalArgumentException e) {
            docType = Document.DocumentType.OTHER;
        }
        DocumentUploadResponse response = documentService.uploadDocument(file, userId, docType);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<Document> documents = documentService.getDocumentsByUser(userId);
        List<DocumentResponse> response = documents.stream()
                .map(documentMapper::toResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDocument(@PathVariable Long id) {
        Document document = documentService.getDocumentById(id);
        return ResponseEntity.ok(ApiResponse.success(documentMapper.toResponse(document)));
    }

    @GetMapping("/{id}/chunks")
    public ResponseEntity<ApiResponse<List<DocumentChunkResponse>>> getDocumentChunks(@PathVariable Long id) {
        List<DocumentChunk> chunks = documentService.getDocumentChunks(id);
        List<DocumentChunkResponse> response = chunks.stream()
                .map(documentMapper::toChunkResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }
}
