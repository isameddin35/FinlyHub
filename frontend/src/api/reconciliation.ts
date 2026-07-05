import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { ReconciliationResponse, ReconciliationMatchResponse, ReconciliationUploadResponse } from '@/types/reconciliation'

export const reconciliationApi = {
  match: (bankFile: File, accountingFile: File, title: string, periodStart: string, periodEnd: string) => {
    const formData = new FormData()
    formData.append('bankFile', bankFile)
    formData.append('accountingFile', accountingFile)
    formData.append('title', title)
    formData.append('periodStart', periodStart)
    formData.append('periodEnd', periodEnd)
    return apiClient.post<ApiResponse<ReconciliationUploadResponse>>('/reconciliation/match', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () =>
    apiClient.get<ApiResponse<ReconciliationResponse[]>>('/reconciliation'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<ReconciliationMatchResponse>>(`/reconciliation/${id}`),

  approve: (id: number) =>
    apiClient.put<ApiResponse<void>>(`/reconciliation/${id}/approve`),
}
