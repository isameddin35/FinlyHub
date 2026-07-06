package com.finlyhub.document.mapper;

import com.finlyhub.document.dto.DocumentChunkResponse;
import com.finlyhub.document.dto.DocumentResponse;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.entity.DocumentChunk;
import com.finlyhub.user.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentMapperTest {

    private final DocumentMapper mapper = new DocumentMapper();

    @Test
    void toResponse_MapsAllFieldsCorrectly() {
        User user = new User();
        user.setId(1L);

        Document document = new Document();
        document.setId(1L);
        document.setUser(user);
        document.setFilename("report.pdf");
        document.setOriginalFilename("Q4_Report.pdf");
        document.setContentType("application/pdf");
        document.setFileSize(1024L);
        document.setDocumentType(Document.DocumentType.POLICY);
        document.setStatus(Document.DocumentStatus.INDEXED);
        document.setErrorMessage(null);
        document.setCreatedAt(LocalDateTime.of(2026, 1, 1, 10, 0));
        document.setUpdatedAt(LocalDateTime.of(2026, 1, 1, 12, 0));

        DocumentResponse response = mapper.toResponse(document);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getUserId()).isEqualTo(1L);
        assertThat(response.getFilename()).isEqualTo("report.pdf");
        assertThat(response.getOriginalFilename()).isEqualTo("Q4_Report.pdf");
        assertThat(response.getContentType()).isEqualTo("application/pdf");
        assertThat(response.getFileSize()).isEqualTo(1024L);
        assertThat(response.getDocumentType()).isEqualTo(Document.DocumentType.POLICY);
        assertThat(response.getStatus()).isEqualTo(Document.DocumentStatus.INDEXED);
        assertThat(response.getErrorMessage()).isNull();
    }

    @Test
    void toResponse_WithError_SetsErrorMessage() {
        User user = new User();
        user.setId(1L);

        Document document = new Document();
        document.setId(2L);
        document.setUser(user);
        document.setFilename("broken.pdf");
        document.setOriginalFilename("broken.pdf");
        document.setDocumentType(Document.DocumentType.OTHER);
        document.setStatus(Document.DocumentStatus.ERROR);
        document.setErrorMessage("Failed to parse");
        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());

        DocumentResponse response = mapper.toResponse(document);

        assertThat(response.getStatus()).isEqualTo(Document.DocumentStatus.ERROR);
        assertThat(response.getErrorMessage()).isEqualTo("Failed to parse");
    }

    @Test
    void toChunkResponse_MapsContentPreviewCorrectly() {
        DocumentChunk chunk = new DocumentChunk();
        chunk.setId(1L);
        chunk.setDocumentId(10L);
        chunk.setChunkIndex(0);
        chunk.setContent("This is a short content preview");
        chunk.setTokenCount(5);

        DocumentChunkResponse response = mapper.toChunkResponse(chunk);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getDocumentId()).isEqualTo(10L);
        assertThat(response.getChunkIndex()).isEqualTo(0);
        assertThat(response.getContent()).isEqualTo("This is a short content preview");
        assertThat(response.getTokenCount()).isEqualTo(5);
    }

    @Test
    void toChunkResponse_TruncatesLongContent() {
        DocumentChunk chunk = new DocumentChunk();
        chunk.setId(2L);
        chunk.setDocumentId(10L);
        chunk.setChunkIndex(1);
        chunk.setContent("A".repeat(500));
        chunk.setTokenCount(100);

        DocumentChunkResponse response = mapper.toChunkResponse(chunk);

        assertThat(response.getContent()).hasSize(200);
    }
}
