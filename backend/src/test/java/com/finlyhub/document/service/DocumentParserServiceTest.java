package com.finlyhub.document.service;

import com.finlyhub.common.service.TokenizerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentParserServiceTest {

    private static final int TOKENS_PER_WORD = 100;

    @Mock
    private TokenizerService tokenizerService;

    private DocumentParserService parserService;

    @BeforeEach
    void setUp() {
        parserService = new DocumentParserService(tokenizerService);
        lenient().when(tokenizerService.countTokens(anyString())).thenReturn(TOKENS_PER_WORD);
    }

    @Test
    void chunkDocument_RespectsTokenBudgetInsteadOfWordCount() {
        String text = "w0 w1 w2 w3 w4 w5 w6 w7 w8 w9";

        List<String> chunks = parserService.chunkDocument(text);

        assertThat(chunks).hasSize(3);
        assertThat(chunks.get(0)).isEqualTo("w0 w1 w2 w3 w4");
        assertThat(chunks.get(1)).isEqualTo("w4 w5 w6 w7 w8");
        assertThat(chunks.get(2)).isEqualTo("w8 w9");
    }

    @Test
    void chunkDocument_SingleChunk_WhenUnderTokenLimit() {
        String text = "w0 w1 w2 w3";

        List<String> chunks = parserService.chunkDocument(text);

        assertThat(chunks).containsExactly("w0 w1 w2 w3");
    }

    @Test
    void chunkDocument_EmptyText_ReturnsEmptyList() {
        assertThat(parserService.chunkDocument("")).isEmpty();
        assertThat(parserService.chunkDocument("   ")).isEmpty();
    }

    @Test
    void countTokens_DelegatesToTokenizer() {
        when(tokenizerService.countTokens("hello world")).thenReturn(7);

        assertThat(parserService.countTokens("hello world")).isEqualTo(7);
        assertThat(parserService.countTokens("")).isZero();
        assertThat(parserService.countTokens(null)).isZero();
    }
}
