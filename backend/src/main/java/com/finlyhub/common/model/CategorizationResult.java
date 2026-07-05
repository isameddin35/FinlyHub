package com.finlyhub.common.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategorizationResult {

    private String categoryName;
    private Long categoryId;
    private Double confidenceScore;
    private String reasoning;
}
