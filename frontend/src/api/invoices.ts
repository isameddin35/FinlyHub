import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { InvoiceResponse, InvoiceUploadResponse, InvoiceApprovalRequest } from '@/types/invoice'

export const invoiceApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<ApiResponse<InvoiceUploadResponse>>('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () =>
    apiClient.get<ApiResponse<{ content: InvoiceResponse[] }>>('/invoices'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<InvoiceResponse>>(`/invoices/${id}`),

  approve: (id: number, data: InvoiceApprovalRequest) =>
    apiClient.put<ApiResponse<InvoiceResponse>>(`/invoices/${id}/approve`, data),

  exportApproved: () =>
    apiClient.get('/invoices/export', { responseType: 'blob' }),
}
