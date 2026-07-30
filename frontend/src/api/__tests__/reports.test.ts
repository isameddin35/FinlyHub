import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reportApi } from '@/api/reports'
import apiClient from '@/api/client'
import { mockApiResponse, mockBlobResponse } from './test-utils'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('reportApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('generate posts to /reports/generate', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue(mockApiResponse(null))

    await reportApi.generate({ type: 'PROFIT_LOSS', subtype: 'annual', periodStart: '2026-01-01', periodEnd: '2026-03-31' })

    expect(mockPost).toHaveBeenCalledWith('/reports/generate', {
      type: 'PROFIT_LOSS', subtype: 'annual', periodStart: '2026-01-01', periodEnd: '2026-03-31'
    })
  })

  it('list gets /reports', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse([]))

    await reportApi.list()

    expect(mockGet).toHaveBeenCalledWith('/reports')
  })

  it('getById gets /reports/:id', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse(null))

    await reportApi.getById(1)

    expect(mockGet).toHaveBeenCalledWith('/reports/1')
  })

  it('export gets /reports/:id/export with format', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockBlobResponse(new Blob()))

    await reportApi.export(1, 'pdf')

    expect(mockGet).toHaveBeenCalledWith('/reports/1/export?format=pdf', { responseType: 'blob' })
  })
})
