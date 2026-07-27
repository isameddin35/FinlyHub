import { describe, it, expect, vi, beforeEach } from 'vitest'
import { documentApi } from '@/api/documents'
import apiClient from '@/api/client'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('documentApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('upload posts file to /documents/upload', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true, data: { id: 1 } } } as any)

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    await documentApi.upload(file)

    expect(mockPost).toHaveBeenCalledWith(
      '/documents/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': undefined } }
    )
  })

  it('list gets /documents', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue({ data: { success: true, data: [] } } as any)

    await documentApi.list()

    expect(mockGet).toHaveBeenCalledWith('/documents')
  })

  it('delete calls DELETE /documents/:id', async () => {
    const mockDelete = vi.mocked(apiClient.delete)
    mockDelete.mockResolvedValue({ data: { success: true } } as any)

    await documentApi.delete(1)

    expect(mockDelete).toHaveBeenCalledWith('/documents/1')
  })

  it('reprocess posts to /documents/:id/reprocess', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue({ data: { success: true } } as any)

    await documentApi.reprocess(1)

    expect(mockPost).toHaveBeenCalledWith('/documents/1/reprocess')
  })
})
