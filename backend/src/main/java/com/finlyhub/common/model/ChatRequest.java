package com.finlyhub.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    private String message;
    private List<String> conversationHistory;
    private List<SourceDocument> relevantDocuments;
}
