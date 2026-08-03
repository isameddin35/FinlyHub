package com.finlyhub.document.service;

import com.finlyhub.common.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;

@Component
@Profile("demo")
@ConditionalOnProperty(name = "ai.retrieval.reindex-on-startup", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DemoEmbeddingReindexer implements ApplicationRunner {

    private static final int BATCH_SIZE = 32;

    private final AiService aiService;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public void run(ApplicationArguments args) {
        try {
            reindexSeededChunks();
        } catch (Exception e) {
            log.error("Demo embedding reindex failed, continuing startup", e);
        }
    }

    void reindexSeededChunks() {
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT id, content FROM document_chunks WHERE content IS NOT NULL ORDER BY id")
                .getResultList();

        if (rows.isEmpty()) {
            log.info("No document chunks found to re-embed");
            return;
        }

        List<Long> ids = new ArrayList<>(rows.size());
        List<String> contents = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            ids.add(((Number) row[0]).longValue());
            contents.add((String) row[1]);
        }

        int ok = 0;
        for (int batchStart = 0; batchStart < contents.size(); batchStart += BATCH_SIZE) {
            int batchEnd = Math.min(batchStart + BATCH_SIZE, contents.size());
            List<String> batch = contents.subList(batchStart, batchEnd);
            List<List<Float>> embeddings = aiService.generateEmbeddings(batch);
            for (int i = 0; i < batch.size(); i++) {
                List<Float> emb = i < embeddings.size() ? embeddings.get(i) : List.of();
                if (emb.isEmpty()) {
                    continue;
                }
                String embeddingStr = emb.stream()
                        .map(String::valueOf)
                        .collect(java.util.stream.Collectors.joining(",", "[", "]"));
                Query update = entityManager.createNativeQuery(
                                "UPDATE document_chunks SET embedding = cast(? as vector), embedding_status = 'OK' WHERE id = ?")
                        .setParameter(1, embeddingStr)
                        .setParameter(2, ids.get(batchStart + i));
                update.executeUpdate();
                ok++;
            }
        }

        log.info("Re-embedded {} document chunks with real BGE vectors", ok);
    }
}