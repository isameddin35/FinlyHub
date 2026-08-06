import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitFor } from '@testing-library/react'
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

describe('chatbotApi.streamMessage (SSE)', () => {
  const mockFetch = vi.fn()
  const onToken = vi.fn()
  const onDone = vi.fn()
  const onError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    localStorage.setItem('accessToken', 'test-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  function streamResponse(chunks: string[], status = 200): Response {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    })
    return new Response(stream, { status, headers: { 'Content-Type': 'text/event-stream' } })
  }

  function sseEvents(events: Array<{ event: string; data: string }>): string {
    return events.map((e) => `event: ${e.event}\ndata: ${e.data}\n\n`).join('')
  }

  function expectCompleted() {
    return waitFor(() => {
      expect(onError).not.toHaveBeenCalled()
    })
  }

  it('streams tokens and completes with the done payload', async () => {
    mockFetch.mockResolvedValue(streamResponse([
      sseEvents([
        { event: 'token', data: 'Hello' },
        { event: 'token', data: 'world' },
        { event: 'done', data: JSON.stringify({ id: 2, conversationId: 1, role: 'assistant', content: 'Hello world', sources: null, confidenceScore: null, createdAt: '2026-01-01T00:00:00' }) },
      ]),
    ]))

    chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(onToken).toHaveBeenNthCalledWith(1, 'Hello')
      expect(onToken).toHaveBeenNthCalledWith(2, 'world')
    })
    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ id: 2, content: 'Hello world' }))
    })
    await expectCompleted()
  })

  it('parses SSE lines split across chunk boundaries', async () => {
    mockFetch.mockResolvedValue(streamResponse([
      'event: token\ndata: Hel',
      'lo\n\nevent: done\ndata: {"id":2,"conversationId":1,"role":"assistant","content":"Hello","sources":null,"confidenceScore":null,"createdAt":"2026-01-01T00:00:00"}\n\n',
    ]))

    chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(onToken).toHaveBeenCalledWith('Hello')
    })
    await waitFor(() => {
      expect(onDone).toHaveBeenCalled()
    })
    await expectCompleted()
  })

  it('ignores data lines without a preceding event type', async () => {
    mockFetch.mockResolvedValue(streamResponse([
      'data: stray-payload\n\n' + sseEvents([{ event: 'done', data: JSON.stringify({ id: 2, conversationId: 1, role: 'assistant', content: 'ok', sources: null, confidenceScore: null, createdAt: '2026-01-01T00:00:00' }) }]),
    ]))

    chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(onDone).toHaveBeenCalled()
    })
    expect(onToken).not.toHaveBeenCalled()
    await expectCompleted()
  })

  it('reports an error when the done payload is not valid JSON', async () => {
    mockFetch.mockResolvedValue(streamResponse([
      sseEvents([{ event: 'done', data: 'not-json' }]),
    ]))

    chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Failed to parse stream response'))
    })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('reports an error when the stream ends without a done event', async () => {
    mockFetch.mockResolvedValue(streamResponse([
      sseEvents([{ event: 'token', data: 'partial' }]),
    ]))

    chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Stream ended without completion'))
    })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('reports the response body when the server responds with an error status', async () => {
    mockFetch.mockResolvedValue(new Response('Server exploded', { status: 500 }))

    chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(new Error('Server exploded'))
    })
  })

  it('sends the auth header and stream URL with the message body', async () => {
    mockFetch.mockResolvedValue(streamResponse([sseEvents([{ event: 'done', data: '{}' }])]))

    chatbotApi.streamMessage(7, { message: 'How are invoices handled?', documentType: 'INVOICE' }, onToken, onDone, onError)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat/conversations/7/messages/stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
          body: JSON.stringify({ message: 'How are invoices handled?', documentType: 'INVOICE' }),
          signal: expect.any(AbortSignal),
        }),
      )
    })
  })

  it('aborting the returned controller cancels the request without an error', async () => {
    mockFetch.mockImplementation((_url: string, init: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
    )

    const controller = chatbotApi.streamMessage(1, { message: 'Hi' }, onToken, onDone, onError)
    expect(controller).toBeInstanceOf(AbortController)

    controller.abort()

    await waitFor(() => {
      expect(onError).not.toHaveBeenCalled()
    })
    expect(onDone).not.toHaveBeenCalled()
  })
})
