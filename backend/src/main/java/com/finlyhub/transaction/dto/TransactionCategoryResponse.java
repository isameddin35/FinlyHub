package com.finlyhub.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionCategoryResponse {

    private Long id;
    private String name;
    private String description;
    private String icon;
    private String color;
}
