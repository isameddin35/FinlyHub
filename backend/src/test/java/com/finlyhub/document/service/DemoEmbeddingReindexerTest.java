package com.finlyhub.document.service;

import com.finlyhub.common.service.AiService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DemoEmbeddingReindexerTest {

    @Mock
    private AiService aiService;
    @Mock
    private EntityManager entityManager;

    private DemoEmbeddingReindexer reindexer;

    @BeforeEach
    void setUp() {
        reindexer = new DemoEmbeddingReindexer(aiService);
        org.springframework.test.util.ReflectionTestUtils.setField(reindexer, "entityManager", entityManager);
    }

    @Test
    void reindexSeededChunks_Over64Rows_BatchesEmbeddingsInGroupsOf32() {
        Query selectQuery = mock(Query.class);
        Query updateQuery = mock(Query.class);
        when(entityManager.createNativeQuery(contains("SELECT id"))).thenReturn(selectQuery);
        when(entityManager.createNativeQuery(contains("UPDATE document_chunks"))).thenReturn(updateQuery);
        when(selectQuery.getResultList()).thenReturn(rows(65));
        lenient().when(updateQuery.setParameter(anyInt(), any())).thenReturn(updateQuery);
        when(updateQuery.executeUpdate()).thenReturn(1);
        when(aiService.generateEmbeddings(any())).thenAnswer(invocation -> {
            List<String> batch = invocation.getArgument(0);
            return batch.stream().map(text -> List.of(0.5f)).toList();
        });

        reindexer.reindexSeededChunks();

        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(aiService, times(3)).generateEmbeddings(captor.capture());
        assertThat(captor.getAllValues()).hasSize(3);
        assertThat(captor.getAllValues().get(0)).hasSize(32);
        assertThat(captor.getAllValues().get(1)).hasSize(32);
        assertThat(captor.getAllValues().get(2)).hasSize(1);
        verify(updateQuery, times(65)).executeUpdate();
    }

    @Test
    void reindexSeededChunks_EmptyRows_SkipsEmbedding() {
        Query selectQuery = mock(Query.class);
        when(entityManager.createNativeQuery(contains("SELECT id"))).thenReturn(selectQuery);
        when(selectQuery.getResultList()).thenReturn(List.of());

        reindexer.reindexSeededChunks();

        verify(aiService, never()).generateEmbeddings(any());
        verify(entityManager, never()).createNativeQuery(contains("UPDATE document_chunks"));
    }

    @Test
    void reindexSeededChunks_EmptyEmbeddingResult_SkipsChunk() {
        Query selectQuery = mock(Query.class);
        Query updateQuery = mock(Query.class);
        when(entityManager.createNativeQuery(contains("SELECT id"))).thenReturn(selectQuery);
        when(selectQuery.getResultList()).thenReturn(rows(2));
        when(aiService.generateEmbeddings(any())).thenReturn(List.of(List.of(), List.of()));
        lenient().when(entityManager.createNativeQuery(contains("UPDATE document_chunks"))).thenReturn(updateQuery);
        lenient().when(updateQuery.setParameter(anyInt(), any())).thenReturn(updateQuery);
        lenient().when(updateQuery.executeUpdate()).thenReturn(1);

        reindexer.reindexSeededChunks();

        verify(updateQuery, never()).executeUpdate();
    }

    @Test
    void reindexSeededChunks_UpdateUsesCastVectorAndOkStatus() {
        Query selectQuery = mock(Query.class);
        Query updateQuery = mock(Query.class);
        when(entityManager.createNativeQuery(contains("SELECT id"))).thenReturn(selectQuery);
        when(entityManager.createNativeQuery(contains("UPDATE document_chunks"))).thenReturn(updateQuery);
        when(selectQuery.getResultList()).thenReturn(rows(1));
        when(aiService.generateEmbeddings(any())).thenReturn(List.of(List.of(0.1f, 0.2f)));
        when(updateQuery.setParameter(anyInt(), any())).thenReturn(updateQuery);
        when(updateQuery.executeUpdate()).thenReturn(1);

        reindexer.reindexSeededChunks();

        verify(entityManager).createNativeQuery(contains("UPDATE document_chunks SET embedding = cast(? as vector), embedding_status = 'OK' WHERE id = ?"));
        verify(updateQuery).setParameter(1, "[0.1,0.2]");
        verify(updateQuery).setParameter(2, 1L);
        verify(updateQuery).executeUpdate();
    }

    private List<Object[]> rows(int count) {
        List<Object[]> rows = new ArrayList<>(count);
        for (int i = 1; i <= count; i++) {
            rows.add(new Object[]{i, "content " + i});
        }
        return rows;
    }
}
