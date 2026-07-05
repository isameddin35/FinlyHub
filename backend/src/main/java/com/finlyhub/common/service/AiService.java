package com.finlyhub.common.service;

import com.finlyhub.common.model.CategorizationResult;
import com.finlyhub.common.model.ChatRequest;
import com.finlyhub.common.model.ChatResponse;
import com.finlyhub.common.model.ExtractionResult;

import java.util.List;
import java.util.function.Consumer;

public interface AiService {

    ExtractionResult extractInvoiceData(String ocrText);

    ChatResponse chat(ChatRequest request);

    List<Float> generateEmbedding(String text);

    CategorizationResult categorizeTransaction(String description, double amount);

    default void streamChat(ChatRequest request, Consumer<String> onToken, Runnable onComplete) {
        ChatResponse response = chat(request);
        if (response.getMessage() != null) {
            onToken.accept(response.getMessage());
        }
        onComplete.run();
    }
}
