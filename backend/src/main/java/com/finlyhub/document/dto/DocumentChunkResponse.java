package com.finlyhub.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunkResponse {

    private Long id;
    private Long documentId;
    private Integer chunkIndex;
    private String content;
    private Integer tokenCount;
}
