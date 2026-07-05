package com.finlyhub.reconciliation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationUploadRequest {

    @NotNull
    private String title;

    private LocalDate periodStart;

    private LocalDate periodEnd;
}
