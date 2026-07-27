package com.finlyhub.document.service;

import com.finlyhub.common.exception.ResourceNotFoundException;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.document.dto.DocumentUploadResponse;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.entity.DocumentChunk;
import com.finlyhub.document.mapper.DocumentMapper;
import com.finlyhub.document.repository.DocumentChunkRepository;
import com.finlyhub.document.repository.DocumentRepository;
import com.finlyhub.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final DocumentMapper documentMapper;
    private final DocumentProcessingService documentProcessingService;

    @Value("${app.upload.dir:uploads}/documents")
    private String uploadDir;

    public DocumentUploadResponse uploadDocument(MultipartFile file, Long userId, Document.DocumentType type) {
        try {
            String originalFilename = file.getOriginalFilename();
            String filename = UUID.randomUUID() + "_" + originalFilename;

            Path uploadPath = Paths.get(uploadDir);
            Files.createDirectories(uploadPath);
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            User user = SecurityUtils.getCurrentUser();

            Document document = new Document();
            document.setUser(user);
            document.setFilename(filename);
            document.setOriginalFilename(originalFilename);
            document.setContentType(file.getContentType());
            document.setFileSize(file.getSize());
            document.setStoragePath(filePath.toString());
            document.setDocumentType(type);
            document.setStatus(Document.DocumentStatus.UPLOADED);
            document = documentRepository.save(document);

            Long docId = document.getId();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    documentProcessingService.processDocument(docId);
                }
            });

            return DocumentUploadResponse.builder()
                    .id(document.getId())
                    .filename(originalFilename)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .status(Document.DocumentStatus.UPLOADED)
                    .message("Document uploaded successfully, processing in background")
                    .build();

        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Document> getDocumentsByUser(Long userId) {
        return documentRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Document getDocumentById(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", documentId));
    }

    @Transactional(readOnly = true)
    public List<DocumentChunk> getDocumentChunks(Long documentId) {
        return chunkRepository.findByDocumentIdOrderByChunkIndex(documentId);
    }

    public void deleteDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", documentId));

        List<DocumentChunk> chunks = chunkRepository.findByDocumentId(documentId);
        chunkRepository.deleteAll(chunks);

        try {
            if (document.getStoragePath() != null) {
                Files.deleteIfExists(Paths.get(document.getStoragePath()));
            }
        } catch (IOException ignored) {
        }

        documentRepository.delete(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentChunk> searchSimilarChunks(String query, int limit) {
        return List.of();
    }

    @Transactional(readOnly = true)
    public List<Document> findByUserIdAndStatus(Long userId, Document.DocumentStatus status) {
        return documentRepository.findByUserIdAndStatus(userId, status);
    }

    public void reprocessDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", documentId));

        List<DocumentChunk> existingChunks = chunkRepository.findByDocumentId(documentId);
        if (!existingChunks.isEmpty()) {
            chunkRepository.deleteAll(existingChunks);
        }

        document.setStatus(Document.DocumentStatus.UPLOADED);
        document.setErrorMessage(null);
        document = documentRepository.save(document);

        Long docId = document.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                documentProcessingService.processDocument(docId);
            }
        });
    }
}
