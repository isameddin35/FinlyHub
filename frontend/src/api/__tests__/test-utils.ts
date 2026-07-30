import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/api'

export function mockApiResponse<T>(data: T): AxiosResponse<ApiResponse<T>> {
  return {
    data: { success: true, message: 'Operation successful', data, timestamp: '2024-01-01T00:00:00Z' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  }
}

export function mockBlobResponse(blob: Blob): AxiosResponse<Blob> {
  return {
    data: blob,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  }
}
