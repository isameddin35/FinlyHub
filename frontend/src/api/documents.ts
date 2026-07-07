import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { Document } from '@/types/document'

export const documentApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<ApiResponse<Document>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () => apiClient.get<ApiResponse<Document[]>>('/documents'),

  delete: (id: number) => apiClient.delete<ApiResponse<void>>(`/documents/${id}`),

  download: (id: number) =>
    apiClient.get(`/documents/${id}/download`, { responseType: 'blob' }),
}
