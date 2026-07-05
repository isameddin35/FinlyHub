package com.finlyhub.reconciliation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReconciliationMatchResponse {

    private ReconciliationResponse reconciliation;

    private List<ReconciliationEntryResponse> matched;

    private List<ReconciliationEntryResponse> unmatched;

    private List<ReconciliationEntryResponse> needsReview;
}
