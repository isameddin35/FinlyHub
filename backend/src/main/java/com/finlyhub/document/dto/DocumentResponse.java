package com.finlyhub.document.dto;

import com.finlyhub.document.entity.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {

    private Long id;
    private Long userId;
    private String filename;
    private String originalFilename;
    private String contentType;
    private Long fileSize;
    private Document.DocumentType documentType;
    private Document.DocumentStatus status;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
