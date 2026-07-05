import type { ApiResponse } from '@/types/api'
import type { ConversationResponse, MessageResponse, CreateConversationRequest, SendMessageRequest } from '@/types/chatbot'

const API_BASE = '/api/chat'

async function handleResponse<T>(response: Response): Promise<T> {
  const json = await response.json()
  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Request failed')
  }
  return json.data as T
}

export const chatbotApi = {
  createConversation: async (data?: CreateConversationRequest) => {
    const response = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      body: JSON.stringify(data || {}),
    })
    return handleResponse<ConversationResponse>(response)
  },

  listConversations: async () => {
    const res = await fetch(`${API_BASE}/conversations`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    })
    return handleResponse<ConversationResponse[]>(res)
  },

  sendMessage: (conversationId: number, data: SendMessageRequest) =>
    fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      body: JSON.stringify(data),
    }).then((r) => handleResponse<MessageResponse>(r)),

  streamMessage: (
    conversationId: number,
    data: SendMessageRequest,
    onToken: (token: string) => void,
    onDone: (response: MessageResponse) => void,
    onError: (error: Error) => void,
  ): AbortController => {
    const abortController = new AbortController()

    fetch(`${API_BASE}/conversations/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(data),
      signal: abortController.signal,
    }).then(async (response) => {
      if (!response.ok) {
        const text = await response.text()
        onError(new Error(text || `HTTP ${response.status}`))
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let eventType = ''
      let doneReceived = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        while (buffer.includes('\n')) {
          const idx = buffer.indexOf('\n')
          const line = idx === 0 ? '' : buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)

          if (line.startsWith('event:')) {
            eventType = line[6] === ' ' ? line.slice(7).trim() : line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line[5] === ' ' ? line.slice(6) : line.slice(5)
            if (eventType === 'token') {
              onToken(data)
            } else if (eventType === 'done') {
              doneReceived = true
              try {
                const parsed = JSON.parse(data)
                onDone(parsed as MessageResponse)
              } catch {
                onError(new Error('Failed to parse stream response'))
              }
            }
          }
        }
      }

      if (!doneReceived) {
        onError(new Error('Stream ended without completion'))
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err instanceof Error ? err : new Error(String(err)))
      }
    })

    return abortController
  },

  getMessages: async (conversationId: number) => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    })
    return handleResponse<MessageResponse[]>(res)
  },

  deleteConversation: async (conversationId: number) => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
    })
    return handleResponse<null>(res)
  },
}
