import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chatbotApi } from '@/api/chatbot'
import apiClient from '@/api/client'
import { mockApiResponse } from './test-utils'

vi.mock('@/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: '/api' },
  },
}))

describe('chatbotApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('createConversation posts to /chat/conversations', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue(mockApiResponse({ id: 1, title: 'Test' }))

    const result = await chatbotApi.createConversation({ title: 'Test' })

    expect(mockPost).toHaveBeenCalledWith('/chat/conversations', { title: 'Test' })
    expect(result.title).toBe('Test')
  })

  it('listConversations gets /chat/conversations', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse([]))

    const result = await chatbotApi.listConversations()

    expect(mockGet).toHaveBeenCalledWith('/chat/conversations')
    expect(result).toEqual([])
  })

  it('sendMessage posts to conversation messages', async () => {
    const mockPost = vi.mocked(apiClient.post)
    mockPost.mockResolvedValue(mockApiResponse({ id: 100, content: 'Reply' }))

    const result = await chatbotApi.sendMessage(1, { message: 'Hello' })

    expect(mockPost).toHaveBeenCalledWith('/chat/conversations/1/messages', { message: 'Hello' })
    expect(result.content).toBe('Reply')
  })

  it('getMessages gets conversation messages', async () => {
    const mockGet = vi.mocked(apiClient.get)
    mockGet.mockResolvedValue(mockApiResponse([]))

    const result = await chatbotApi.getMessages(1)

    expect(mockGet).toHaveBeenCalledWith('/chat/conversations/1/messages')
    expect(result).toEqual([])
  })

  it('deleteConversation deletes conversation', async () => {
    const mockDelete = vi.mocked(apiClient.delete)
    mockDelete.mockResolvedValue(mockApiResponse(null))

    await chatbotApi.deleteConversation(1)

    expect(mockDelete).toHaveBeenCalledWith('/chat/conversations/1')
  })
})
