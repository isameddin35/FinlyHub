package com.finlyhub.dashboard.controller;

import com.finlyhub.common.dto.ApiResponse;
import com.finlyhub.common.util.SecurityUtils;
import com.finlyhub.dashboard.dto.DashboardMetricsResponse;
import com.finlyhub.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<DashboardMetricsResponse>> getMetrics() {
        Long userId = SecurityUtils.getCurrentUserId();
        DashboardMetricsResponse metrics = dashboardService.getMetrics(userId);
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }
}
