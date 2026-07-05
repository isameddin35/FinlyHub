package com.finlyhub.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricsResponse {

    private long invoicesProcessed;
    private long documentsIndexed;
    private long transactionsCategorized;
    private long reconciliationsCompleted;
    private double hoursSaved;
    private double totalRevenue;
    private double totalExpenses;
    private List<ChartDataPoint> revenueTrend;
    private List<ChartDataPoint> expenseTrend;
    private List<ActivityItem> recentActivity;
}
