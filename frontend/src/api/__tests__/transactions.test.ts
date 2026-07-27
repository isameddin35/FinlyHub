import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionApi } from '@/api/transactions'
import apiClient from '@/api/client'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('transactionApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('import posts file to /transactions/import', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true } } as any)

    const file = new File(['c'], 'transactions.csv')
    await transactionApi.import(file)

    expect(mockPost).toHaveBeenCalledWith(
      '/transactions/import',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  })

  it('list gets /transactions', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue({ data: { success: true, data: [] } } as any)

    await transactionApi.list()

    expect(mockGet).toHaveBeenCalledWith('/transactions')
  })

  it('categorize posts to /transactions/:id/categorize', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true } } as any)

    await transactionApi.categorize(1)

    expect(mockPost).toHaveBeenCalledWith('/transactions/1/categorize')
  })

  it('approve puts to /transactions/:id/approve', async () => {
    const mockPut = vi.mocked(apiClient.put)
    mockPut.mockResolvedValue({ data: { success: true } } as any)

    await transactionApi.approve(1, { categoryId: 5 })

    expect(mockPut).toHaveBeenCalledWith('/transactions/1/approve', { categoryId: 5 })
  })

  it('getCategories gets /transactions/categories', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue({ data: { success: true, data: [] } } as any)

    await transactionApi.getCategories()

    expect(mockGet).toHaveBeenCalledWith('/transactions/categories')
  })
})
