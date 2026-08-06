import apiClient from './client'
import type { ApiResponse } from '@/types/api'
import type { ConversationResponse, MessageResponse, CreateConversationRequest, SendMessageRequest } from '@/types/chatbot'

type TokenHandler = (token: string) => void
type DoneHandler = (response: MessageResponse) => void
type ErrorHandler = (error: Error) => void

class SseParser {
  private buffer = ''
  private eventType = ''
  doneReceived = false

  append(chunk: string, onToken: TokenHandler, onDone: DoneHandler, onError: ErrorHandler): void {
    this.buffer += chunk
    while (this.buffer.includes('\n')) {
      const idx = this.buffer.indexOf('\n')
      const line = idx === 0 ? '' : this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 1)
      this.consumeLine(line, onToken, onDone, onError)
    }
  }

  private consumeLine(line: string, onToken: TokenHandler, onDone: DoneHandler, onError: ErrorHandler): void {
    if (line.startsWith('event:')) {
      this.eventType = line.slice(6).trim()
      return
    }
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (this.eventType === 'token') {
      onToken(payload)
      return
    }
    if (this.eventType === 'done') {
      this.doneReceived = true
      try {
        onDone(JSON.parse(payload) as MessageResponse)
      } catch {
        onError(new Error('Failed to parse stream response'))
      }
    }
  }
}

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
      const parser = new SseParser()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        parser.append(decoder.decode(value, { stream: true }), onToken, onDone, onError)
      }

      if (!parser.doneReceived) {
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
