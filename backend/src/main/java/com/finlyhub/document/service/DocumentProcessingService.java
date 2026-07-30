package com.finlyhub.document.service;

import com.finlyhub.common.exception.BusinessException;
import com.finlyhub.common.service.AiService;
import com.finlyhub.document.entity.Document;
import com.finlyhub.document.repository.DocumentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentProcessingService {

    private static final int EMBEDDING_DIM = 384;
    private static final int BATCH_SIZE = 32;

    private final DocumentRepository documentRepository;
    private final DocumentParserService parserService;
    private final AiService aiService;
    private final TransactionTemplate transactionTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Async("documentProcessingExecutor")
    public void processDocument(Long documentId) {
        log.info("Starting async processing for document {}", documentId);

        Document document = documentRepository.findById(documentId).orElse(null);
        if (document == null) {
            log.warn("Document {} not found, skipping processing", documentId);
            return;
        }

        try {
            String rawText;
            try (var inputStream = Files.newInputStream(Paths.get(document.getStoragePath()))) {
                rawText = parserService.parseByFilename(inputStream, document.getOriginalFilename());
            }

            if (rawText == null || rawText.isBlank()) {
                throw new BusinessException("Document parsed to empty text");
            }

            List<String> chunks = parserService.chunkDocument(rawText);
            log.info("Document {} parsed into {} chunks", documentId, chunks.size());

            if (chunks.isEmpty()) {
                transactionTemplate.execute(status -> {
                    Document doc = documentRepository.findById(documentId).orElse(null);
                    if (doc != null) {
                        doc.setStatus(Document.DocumentStatus.INDEXED);
                        documentRepository.save(doc);
                    }
                    return null;
                });
                log.info("Document {} has no chunks to index", documentId);
                return;
            }

            transactionTemplate.execute(status -> {
                Document doc = documentRepository.findById(documentId).orElse(null);
                if (doc != null) {
                    doc.setStatus(Document.DocumentStatus.PROCESSING);
                    doc.setTotalChunks(chunks.size());
                    doc.setIndexedChunks(0);
                    documentRepository.save(doc);
                }
                return null;
            });

            String insertSql = "INSERT INTO document_chunks (document_id, chunk_index, content, token_count, filename, embedding, created_at) VALUES (?, ?, ?, ?, ?, cast(? as vector), NOW())";

            for (int batchStart = 0; batchStart < chunks.size(); batchStart += BATCH_SIZE) {
                final int batchStartFinal = batchStart;
                int batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.size());

                final List<String> batch = chunks.subList(batchStart, batchEnd);

                List<List<Float>> embeddings;
                try {
                    embeddings = aiService.generateEmbeddings(batch);
                } catch (Exception e) {
                    log.warn("Embedding batch failed: {}", e.getMessage());
                    embeddings = batch.stream().map(t -> List.<Float>of()).toList();
                }
                final List<List<Float>> batchEmbeddings = embeddings;

                final int totalBefore = batchStart;
                transactionTemplate.execute(status -> {
                    Document doc = documentRepository.findById(documentId).orElse(null);
                    if (doc == null) return null;

                    int inserted = 0;
                    int failed = 0;
                    String sql = insertSql;

                    for (int j = 0; j < batch.size(); j++) {
                        int idx = batchStartFinal + j;
                        String chunkText = batch.get(j);
                        int tokenCount = parserService.countTokens(chunkText);

                        try {
                            List<Float> embeddingVector = (j < batchEmbeddings.size()) ? batchEmbeddings.get(j) : List.of();
                            String embStr;
                            if (embeddingVector == null || embeddingVector.isEmpty()) {
                                embStr = buildZeroVector();
                                log.warn("Document {} chunk {} embedding empty, using zero-vector fallback", documentId, idx);
                            } else {
                                embStr = embeddingVector.stream()
                                        .map(String::valueOf)
                                        .collect(Collectors.joining(","));
                            }

                            entityManager.createNativeQuery(sql)
                                    .setParameter(1, doc.getId())
                                    .setParameter(2, idx)
                                    .setParameter(3, chunkText)
                                    .setParameter(4, tokenCount)
                                    .setParameter(5, doc.getOriginalFilename())
                                    .setParameter(6, "[" + embStr + "]")
                                    .executeUpdate();
                            inserted++;
                        } catch (Exception e) {
                            failed++;
                            log.error("Failed to insert chunk {} for document {}", idx, documentId, e);
                        }
                    }

                    doc.setIndexedChunks(totalBefore + inserted + failed);
                    documentRepository.save(doc);
                    return null;
                });
            }

            transactionTemplate.execute(status -> {
                Document doc = documentRepository.findById(documentId).orElse(null);
                if (doc == null) return null;

                doc.setStatus(Document.DocumentStatus.INDEXED);
                documentRepository.save(doc);
                log.info("Document {} processed: {}/{} chunks indexed", documentId, doc.getIndexedChunks(), doc.getTotalChunks());
                return null;
            });

        } catch (Exception e) {
            log.error("Failed to process document {}", documentId, e);
            transactionTemplate.execute(status -> {
                Document doc = documentRepository.findById(documentId).orElse(null);
                if (doc != null) {
                    doc.setStatus(Document.DocumentStatus.ERROR);
                    doc.setErrorMessage(e.getMessage());
                    documentRepository.save(doc);
                }
                return null;
            });
        }
    }

    private String buildZeroVector() {
        return "0,".repeat(EMBEDDING_DIM - 1) + "0";
    }
}
