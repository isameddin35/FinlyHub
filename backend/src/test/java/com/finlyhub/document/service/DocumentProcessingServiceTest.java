package com.finlyhub.document.service;

import com.finlyhub.common.service.AiService;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.repository.DocumentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentProcessingServiceTest {

    @Mock
    private DocumentRepository documentRepository;
    @Mock
    private DocumentParserService parserService;
    @Mock
    private AiService aiService;
    @Mock
    private TransactionTemplate transactionTemplate;
    @Mock
    private EntityManager entityManager;

    private DocumentProcessingService processingService;
    private Document document;
    private Path tempFile;

    @BeforeEach
    void setUp() throws IOException {
        processingService = new DocumentProcessingService(
                documentRepository, parserService, aiService, transactionTemplate);
        org.springframework.test.util.ReflectionTestUtils.setField(processingService, "entityManager", entityManager);

        tempFile = Files.createTempFile("finlyhub-test", ".pdf");
        Files.writeString(tempFile, "test content");

        document = new Document();
        document.setId(1L);
        document.setOriginalFilename("test.pdf");
        document.setStoragePath(tempFile.toString());
        document.setStatus(Document.DocumentStatus.UPLOADED);

        when(documentRepository.findById(1L)).thenReturn(Optional.of(document));
        when(documentRepository.save(any(Document.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionTemplate.execute(any(TransactionCallback.class))).thenAnswer(invocation -> {
            TransactionCallback<Object> callback = invocation.getArgument(0);
            return callback.doInTransaction(null);
        });
    }

    @Test
    void processDocument_EmbeddingFailure_KeepsChunkWithFailedStatusAndNullVector() throws Exception {
        when(parserService.parseByFilename(any(), anyString())).thenReturn("text content");
        when(parserService.chunkDocument(anyString())).thenReturn(List.of("chunk one"));
        when(parserService.countTokens(anyString())).thenReturn(5);
        when(aiService.generateEmbeddings(List.of("chunk one"))).thenReturn(List.of(List.of()));

        Query insertQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(insertQuery);
        org.mockito.Mockito.lenient().when(insertQuery.setParameter(anyInt(), any())).thenReturn(insertQuery);
        org.mockito.Mockito.lenient().when(insertQuery.setParameter(anyString(), any())).thenReturn(insertQuery);
        when(insertQuery.executeUpdate()).thenReturn(1);

        processingService.processDocument(1L);

        verify(insertQuery).setParameter(6, null);
        verify(insertQuery).setParameter(7, "FAILED");
        verify(documentRepository, org.mockito.Mockito.atLeastOnce()).save(any(Document.class));
        assertThat(document.getStatus()).isEqualTo(Document.DocumentStatus.INDEXED);
    }

    @Test
    void processDocument_EmbeddingSuccess_InsertsVectorWithOkStatus() throws Exception {
        when(parserService.parseByFilename(any(), anyString())).thenReturn("text content");
        when(parserService.chunkDocument(anyString())).thenReturn(List.of("chunk one"));
        when(parserService.countTokens(anyString())).thenReturn(5);
        when(aiService.generateEmbeddings(List.of("chunk one")))
                .thenReturn(List.of(List.of(0.1f, 0.2f, 0.3f)));

        Query insertQuery = mock(Query.class);
        when(entityManager.createNativeQuery(anyString())).thenReturn(insertQuery);
        org.mockito.Mockito.lenient().when(insertQuery.setParameter(anyInt(), any())).thenReturn(insertQuery);
        org.mockito.Mockito.lenient().when(insertQuery.setParameter(anyString(), any())).thenReturn(insertQuery);
        when(insertQuery.executeUpdate()).thenReturn(1);

        processingService.processDocument(1L);

        verify(insertQuery).setParameter(6, "[0.1,0.2,0.3]");
        verify(insertQuery).setParameter(7, "OK");
    }

    @Test
    void processDocument_EmptyChunks_SkipsEmbeddingAndMarksIndexed() throws Exception {
        when(parserService.parseByFilename(any(), anyString())).thenReturn("text content");
        when(parserService.chunkDocument(anyString())).thenReturn(List.of());

        processingService.processDocument(1L);

        verify(aiService, never()).generateEmbeddings(any());
        assertThat(document.getStatus()).isEqualTo(Document.DocumentStatus.INDEXED);
    }

    @Test
    void processDocument_ParseFailure_MarksDocumentError() throws Exception {
        when(parserService.parseByFilename(any(), anyString())).thenThrow(new IOException("parse failed"));

        processingService.processDocument(1L);

        assertThat(document.getStatus()).isEqualTo(Document.DocumentStatus.ERROR);
        assertThat(document.getErrorMessage()).contains("parse failed");
    }
}
