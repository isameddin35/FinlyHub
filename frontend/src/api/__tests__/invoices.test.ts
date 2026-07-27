import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoiceApi } from '@/api/invoices'
import apiClient from '@/api/client'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('invoiceApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('upload posts file to /invoices/upload', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true } } as any)

    const file = new File(['content'], 'inv.pdf', { type: 'application/pdf' })
    await invoiceApi.upload(file)

    expect(mockPost).toHaveBeenCalledWith(
      '/invoices/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  })

  it('list gets /invoices', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue({ data: { success: true, data: { content: [] } } } as any)

    await invoiceApi.list()

    expect(mockGet).toHaveBeenCalledWith('/invoices')
  })

  it('getById gets /invoices/:id', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue({ data: { success: true } } as any)

    await invoiceApi.getById(1)

    expect(mockGet).toHaveBeenCalledWith('/invoices/1')
  })

  it('approve puts to /invoices/:id/approve', async () => {
    const mockPut = vi.mocked(apiClient.put)
    mockPut.mockResolvedValue({ data: { success: true } } as any)

    await invoiceApi.approve(1, { categoryId: 5 })

    expect(mockPut).toHaveBeenCalledWith('/invoices/1/approve', { categoryId: 5 })
  })
})
