export interface ConversationResponse {
  id: number
  title: string
  isActive: boolean
  lastMessage: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface MessageResponse {
  id: number
  conversationId: number
  role: string
  content: string
  sources: SourceDto[] | null
  confidenceScore: number | null
  createdAt: string
}

export interface SourceDto {
  documentId: number
  filename: string
  excerpt: string
  relevanceScore: number
  chunkIndex: number
}

export interface CreateConversationRequest {
  title?: string
}

export interface SendMessageRequest {
  message: string
}
