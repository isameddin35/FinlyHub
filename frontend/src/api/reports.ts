import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { ReportRequest, ReportResponse, ReportSummaryResponse } from '@/types/report'

export const reportApi = {
  generate: (data: ReportRequest) =>
    apiClient.post<ApiResponse<ReportResponse>>('/reports/generate', data),

  list: () =>
    apiClient.get<ApiResponse<ReportSummaryResponse[]>>('/reports'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<ReportResponse>>(`/reports/${id}`),

  export: (id: number, format: string) =>
    apiClient.get(`/reports/${id}/export?format=${format}`, { responseType: 'blob' }),
}
