package com.finlyhub.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceDocument {

    private Long documentId;
    private String filename;
    private String excerpt;
    private Double relevanceScore;
    private Integer chunkIndex;
}
