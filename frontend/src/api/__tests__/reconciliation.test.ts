import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reconciliationApi } from '@/api/reconciliation'
import apiClient from '@/api/client'
import { mockApiResponse } from './test-utils'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('reconciliationApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('match posts files to /reconciliation/match', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue(mockApiResponse(null))

    const bankFile = new File(['b'], 'bank.csv')
    const acctFile = new File(['a'], 'acct.csv')
    await reconciliationApi.match(bankFile, acctFile, 'Test', '2026-01-01', '2026-01-31')

    expect(mockPost).toHaveBeenCalledWith(
      '/reconciliation/match',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  })

  it('list gets /reconciliation', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse([]))

    await reconciliationApi.list()

    expect(mockGet).toHaveBeenCalledWith('/reconciliation')
  })

  it('getById gets /reconciliation/:id', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse(null))

    await reconciliationApi.getById(1)

    expect(mockGet).toHaveBeenCalledWith('/reconciliation/1')
  })

  it('approve puts to /reconciliation/:id/approve', async () => {
    const mockPut = vi.mocked(apiClient.put)
    mockPut.mockResolvedValue(mockApiResponse(null))

    await reconciliationApi.approve(1)

    expect(mockPut).toHaveBeenCalledWith('/reconciliation/1/approve')
  })
})
