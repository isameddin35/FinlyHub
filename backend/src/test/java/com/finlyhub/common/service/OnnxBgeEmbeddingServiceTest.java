package com.finlyhub.common.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OnnxBgeEmbeddingServiceTest {

    @Test
    void embedBatch_Over32Texts_SplitsIntoBatchesOf32() {
        OnnxBgeEmbeddingService service = spy(new OnnxBgeEmbeddingService(null, null, null));
        doAnswer(invocation -> sizedBatchResult(invocation.getArgument(0)))
                .when(service).embedBatchInternal(any());

        List<List<Float>> result = service.embedBatch(texts(70));

        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(service, times(3)).embedBatchInternal(captor.capture());
        assertThat(captor.getAllValues()).hasSize(3);
        assertThat(captor.getAllValues().get(0)).hasSize(32);
        assertThat(captor.getAllValues().get(1)).hasSize(32);
        assertThat(captor.getAllValues().get(2)).hasSize(6);
        assertThat(result).hasSize(70);
        assertThat(result.get(0)).containsExactly(0.1f);
    }

    @Test
    void embedBatch_Under32Texts_SingleBatch() {
        OnnxBgeEmbeddingService service = spy(new OnnxBgeEmbeddingService(null, null, null));
        doAnswer(invocation -> sizedBatchResult(invocation.getArgument(0)))
                .when(service).embedBatchInternal(any());

        List<List<Float>> result = service.embedBatch(texts(10));

        verify(service, times(1)).embedBatchInternal(any());
        assertThat(result).hasSize(10);
        assertThat(result.get(9)).containsExactly(0.1f);
    }

    @Test
    void embedBatch_NullOrEmpty_ReturnsEmptyList() {
        OnnxBgeEmbeddingService service = spy(new OnnxBgeEmbeddingService(null, null, null));

        assertThat(service.embedBatch(null)).isEmpty();
        assertThat(service.embedBatch(List.of())).isEmpty();
        verify(service, never()).embedBatchInternal(any());
    }

    @Test
    void embedBatch_EmptyResults_ConcatenatesFallback() {
        OnnxBgeEmbeddingService service = spy(new OnnxBgeEmbeddingService(null, null, null));
        doAnswer(invocation -> {
            List<String> batch = invocation.getArgument(0);
            return batch.stream().map(text -> List.<Float>of()).toList();
        }).when(service).embedBatchInternal(any());

        List<List<Float>> result = service.embedBatch(texts(70));

        assertThat(result).hasSize(70);
        assertThat(result).allMatch(List::isEmpty);
    }

    private List<List<Float>> sizedBatchResult(List<String> batch) {
        List<List<Float>> result = new ArrayList<>(batch.size());
        for (int i = 0; i < batch.size(); i++) {
            result.add(List.of(0.1f));
        }
        return result;
    }

    private List<String> texts(int count) {
        List<String> texts = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            texts.add("text " + i);
        }
        return texts;
    }
}
