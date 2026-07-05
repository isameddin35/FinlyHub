package com.finlyhub.document.mapper;

import com.finlyhub.document.dto.DocumentChunkResponse;
import com.finlyhub.document.dto.DocumentResponse;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.entity.DocumentChunk;
import org.springframework.stereotype.Component;

@Component
public class DocumentMapper {

    public DocumentResponse toResponse(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .userId(document.getUser().getId())
                .filename(document.getFilename())
                .originalFilename(document.getOriginalFilename())
                .contentType(document.getContentType())
                .fileSize(document.getFileSize())
                .documentType(document.getDocumentType())
                .status(document.getStatus())
                .errorMessage(document.getErrorMessage())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }

    public DocumentChunkResponse toChunkResponse(DocumentChunk chunk) {
        String contentPreview = chunk.getContent() != null && chunk.getContent().length() > 200
                ? chunk.getContent().substring(0, 200)
                : chunk.getContent();

        return DocumentChunkResponse.builder()
                .id(chunk.getId())
                .documentId(chunk.getDocumentId())
                .chunkIndex(chunk.getChunkIndex())
                .content(contentPreview)
                .tokenCount(chunk.getTokenCount())
                .build();
    }
}
