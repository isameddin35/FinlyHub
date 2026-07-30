package com.finlyhub.transaction.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionCategorizeRequest {

    @NotNull
    private Long categoryId;

    private Long suggestedCategoryId;
}
