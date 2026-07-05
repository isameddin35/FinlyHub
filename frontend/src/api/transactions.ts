import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { TransactionResponse, TransactionUploadResponse, TransactionImportResponse, TransactionCategoryResponse, TransactionCategorizeRequest } from '@/types/transaction'

export const transactionApi = {
  import: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<ApiResponse<TransactionUploadResponse>>('/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () =>
    apiClient.get<ApiResponse<TransactionResponse[]>>('/transactions'),

  getPending: () =>
    apiClient.get<ApiResponse<TransactionResponse[]>>('/transactions/pending'),

  categorize: (id: number) =>
    apiClient.post<ApiResponse<TransactionResponse>>(`/transactions/${id}/categorize`),

  categorizeBatch: (batchId: string) =>
    apiClient.post<ApiResponse<TransactionImportResponse>>(`/transactions/batch/${batchId}/categorize`),

  approve: (id: number, data: TransactionCategorizeRequest) =>
    apiClient.put<ApiResponse<TransactionResponse>>(`/transactions/${id}/approve`, data),

  getCategories: () =>
    apiClient.get<ApiResponse<TransactionCategoryResponse[]>>('/transactions/categories'),
}
