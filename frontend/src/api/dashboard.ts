import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { DashboardMetricsResponse } from '@/types/dashboard'

export const dashboardApi = {
  getMetrics: () =>
    apiClient.get<ApiResponse<DashboardMetricsResponse>>('/dashboard/metrics'),
}
