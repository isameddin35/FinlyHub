package com.finlyhub.document.dto;

import com.finlyhub.document.entity.Document;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentUploadResponse {

    private Long id;
    private String filename;
    private String contentType;
    private Long fileSize;
    private Document.DocumentStatus status;
    private String message;
}
