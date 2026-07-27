import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('chatbotApi', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('createConversation posts to /api/chat/conversations', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 1, title: 'Test' } }),
    } as any)

    const { chatbotApi } = await import('@/api/chatbot')
    const result = await chatbotApi.createConversation({ title: 'Test' })

    expect(mockFetch).toHaveBeenCalledWith('/api/chat/conversations', expect.objectContaining({ method: 'POST' }))
    expect(result.title).toBe('Test')
  })

  it('listConversations gets /api/chat/conversations', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    } as any)

    const { chatbotApi } = await import('@/api/chatbot')
    const result = await chatbotApi.listConversations()

    expect(mockFetch.mock.calls[0][0]).toBe('/api/chat/conversations')
    expect(result).toEqual([])
  })

  it('sendMessage posts to conversation messages', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 100, content: 'Reply' } }),
    } as any)

    const { chatbotApi } = await import('@/api/chatbot')
    const result = await chatbotApi.sendMessage(1, { message: 'Hello' })

    expect(mockFetch).toHaveBeenCalledWith('/api/chat/conversations/1/messages', expect.objectContaining({ method: 'POST' }))
    expect(result.content).toBe('Reply')
  })

  it('getMessages gets conversation messages', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    } as any)

    const { chatbotApi } = await import('@/api/chatbot')
    const result = await chatbotApi.getMessages(1)

    expect(mockFetch.mock.calls[0][0]).toBe('/api/chat/conversations/1/messages')
    expect(result).toEqual([])
  })

  it('deleteConversation deletes conversation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as any)

    const { chatbotApi } = await import('@/api/chatbot')
    await chatbotApi.deleteConversation(1)

    expect(mockFetch).toHaveBeenCalledWith('/api/chat/conversations/1', expect.objectContaining({ method: 'DELETE' }))
  })
})
