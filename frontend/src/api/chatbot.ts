import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { ConversationResponse, MessageResponse, CreateConversationRequest, SendMessageRequest } from '@/types/chatbot'

export const chatbotApi = {
  createConversation: async (data?: CreateConversationRequest) => {
    const res = await apiClient.post<ApiResponse<ConversationResponse>>('/chat/conversations', data || {})
    return res.data.data
  },

  listConversations: async () => {
    const res = await apiClient.get<ApiResponse<ConversationResponse[]>>('/chat/conversations')
    return res.data.data
  },

  sendMessage: async (conversationId: number, data: SendMessageRequest) => {
    const res = await apiClient.post<ApiResponse<MessageResponse>>(`/chat/conversations/${conversationId}/messages`, data)
    return res.data.data
  },

  streamMessage: (
    conversationId: number,
    data: SendMessageRequest,
    onToken: (token: string) => void,
    onDone: (response: MessageResponse) => void,
    onError: (error: Error) => void,
  ): AbortController => {
    const abortController = new AbortController()
    const baseUrl = apiClient.defaults.baseURL || '/api'
    const token = localStorage.getItem('accessToken')

    fetch(`${baseUrl}/chat/conversations/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
            const jsonData = line[5] === ' ' ? line.slice(6) : line.slice(5)
            if (eventType === 'token') {
              onToken(jsonData)
            } else if (eventType === 'done') {
              doneReceived = true
              try {
                const parsed = JSON.parse(jsonData)
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
    const res = await apiClient.get<ApiResponse<MessageResponse[]>>(`/chat/conversations/${conversationId}/messages`)
    return res.data.data
  },

  deleteConversation: async (conversationId: number) => {
    const res = await apiClient.delete<ApiResponse<null>>(`/chat/conversations/${conversationId}`)
    return res.data.data
  },
}
