package com.finlyhub.document.service;

import com.finlyhub.common.service.AiService;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.repository.DocumentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentProcessingService {

    private static final int EMBEDDING_DIM = 384;
    private static final int EMBEDDING_MAX_RETRIES = 3;
    private static final long EMBEDDING_RETRY_DELAY_MS = 1000;
    private static final int BATCH_SIZE = 32;

    private final DocumentRepository documentRepository;
    private final DocumentParserService parserService;
    private final AiService aiService;

    @PersistenceContext
    private EntityManager entityManager;

    @Async("documentProcessingExecutor")
    @Transactional
    public void processDocument(Long documentId) {
        log.info("Starting async processing for document {}", documentId);

        Document document = documentRepository.findById(documentId).orElse(null);
        if (document == null) {
            log.warn("Document {} not found, skipping processing", documentId);
            return;
        }

        try {
            document.setStatus(Document.DocumentStatus.PROCESSING);
            documentRepository.save(document);

            String rawText;
            try (var inputStream = Files.newInputStream(Paths.get(document.getStoragePath()))) {
                rawText = parserService.parseByFilename(inputStream, document.getOriginalFilename());
            }
            document.setRawText(rawText);

            if (rawText == null || rawText.isBlank()) {
                throw new RuntimeException("Document parsed to empty text — the file may be scanned/image-based or empty");
            }

            List<String> chunks = parserService.chunkDocument(rawText);
            log.info("Document {} parsed into {} chunks", documentId, chunks.size());

            if (chunks.isEmpty()) {
                document.setStatus(Document.DocumentStatus.INDEXED);
                documentRepository.save(document);
                log.info("Document {} has no chunks to index", documentId);
                return;
            }

            List<List<Float>> embeddings = generateEmbeddingsWithRetry(chunks);

            String insertSql = "INSERT INTO document_chunks (document_id, chunk_index, content, token_count, filename, embedding, created_at) VALUES (?, ?, ?, ?, ?, cast(? as vector), NOW())";

            int insertedCount = 0;
            int failedCount = 0;

            for (int i = 0; i < chunks.size(); i++) {
                String chunkText = chunks.get(i);
                int tokenCount = parserService.countTokens(chunkText);

                try {
                    List<Float> embeddingVector = (i < embeddings.size()) ? embeddings.get(i) : List.of();
                    String embeddingStr;
                    if (embeddingVector == null || embeddingVector.isEmpty()) {
                        embeddingStr = buildZeroVector();
                        log.warn("Document {} chunk {} embedding empty, using zero-vector fallback", documentId, i);
                    } else {
                        embeddingStr = embeddingVector.stream()
                                .map(String::valueOf)
                                .collect(Collectors.joining(","));
                    }

                    entityManager.createNativeQuery(insertSql)
                            .setParameter(1, document.getId())
                            .setParameter(2, i)
                            .setParameter(3, chunkText)
                            .setParameter(4, tokenCount)
                            .setParameter(5, document.getOriginalFilename())
                            .setParameter(6, "[" + embeddingStr + "]")
                            .executeUpdate();
                    insertedCount++;
                } catch (Exception e) {
                    failedCount++;
                    log.error("Failed to insert chunk {} for document {}", i, documentId, e);
                }
            }

            if (insertedCount == 0) {
                throw new RuntimeException("All " + chunks.size() + " chunks failed to insert — check embedding API and database");
            }

            document.setStatus(Document.DocumentStatus.INDEXED);
            if (failedCount > 0) {
                document.setErrorMessage(failedCount + " of " + chunks.size() + " chunks failed (partial index)");
            }
            documentRepository.save(document);
            log.info("Document {} processed: {}/{} chunks indexed", documentId, insertedCount, chunks.size());

        } catch (Exception e) {
            log.error("Failed to process document {}", documentId, e);
            document.setStatus(Document.DocumentStatus.ERROR);
            document.setErrorMessage(e.getMessage());
            documentRepository.save(document);
        }
    }

    private List<List<Float>> generateEmbeddingsWithRetry(List<String> chunks) {
        for (int attempt = 1; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
            try {
                List<List<Float>> results = new ArrayList<>();
                for (int batchStart = 0; batchStart < chunks.size(); batchStart += BATCH_SIZE) {
                    List<String> batch = chunks.subList(batchStart, Math.min(batchStart + BATCH_SIZE, chunks.size()));
                    List<List<Float>> batchResults = aiService.generateEmbeddings(batch);
                    results.addAll(batchResults);
                }
                long nonEmpty = results.stream().filter(e -> e != null && !e.isEmpty()).count();
                if (nonEmpty > 0) {
                    log.info("Embedded {}/{} chunks successfully", nonEmpty, chunks.size());
                    return results;
                }
                log.warn("Embedding attempt {}/{} returned all empty", attempt, EMBEDDING_MAX_RETRIES);
            } catch (Exception e) {
                log.warn("Embedding attempt {}/{} failed: {}", attempt, EMBEDDING_MAX_RETRIES, e.getMessage());
            }
            if (attempt < EMBEDDING_MAX_RETRIES) {
                try {
                    Thread.sleep(EMBEDDING_RETRY_DELAY_MS * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return chunks.stream().map(t -> List.<Float>of()).toList();
                }
            }
        }
        return chunks.stream().map(t -> List.<Float>of()).toList();
    }

    private String buildZeroVector() {
        return "0,".repeat(EMBEDDING_DIM - 1) + "0";
    }
}
