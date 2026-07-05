package com.finlyhub.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceDto {
    private Long documentId;
    private String filename;
    private String excerpt;
    private Double relevanceScore;
    private Integer chunkIndex;
}
