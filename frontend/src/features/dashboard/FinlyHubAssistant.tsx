import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { chatbotApi } from '@/api/chatbot'
import type { ConversationResponse, MessageResponse } from '@/types/chatbot'
import './FinlyHubAssistant.css'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function FinlyHubAssistant() {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [activeConversation, setActiveConversation] = useState<ConversationResponse | null>(null)
  const [draft, setDraft] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['chatConversations'],
    queryFn: () => chatbotApi.listConversations(),
  })

  const { data: serverMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chatMessages', activeConversation?.id],
    queryFn: () => chatbotApi.getMessages(activeConversation!.id),
    enabled: !!activeConversation,
  })

  const createMutation = useMutation({
    mutationFn: () => chatbotApi.createConversation({ title: 'New Chat' }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] })
      setActiveConversation(conversation)
    },
    onError: () => toast.error('Failed to create conversation'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => chatbotApi.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] })
      setActiveConversation(null)
      toast.success('Conversation deleted')
    },
    onError: () => toast.error('Failed to delete conversation'),
  })

  const displayMessages = useMemo(() => {
    const msgs = serverMessages || []
    const result = [...msgs]
    if (lastUserMessage && !msgs.some(m => m.role.toLowerCase() === 'user' && m.content.trim() === lastUserMessage.trim())) {
      result.push({
        id: -1,
        conversationId: activeConversation?.id || 0,
        role: 'user',
        content: lastUserMessage,
        sources: null,
        confidenceScore: null,
        createdAt: new Date().toISOString(),
      } as MessageResponse)
    }
    if (streamingContent) {
      result.push({
        id: 0,
        conversationId: 0,
        role: 'assistant',
        content: streamingContent,
        sources: null,
        confidenceScore: null,
        createdAt: new Date().toISOString(),
      } as MessageResponse)
    }
    return result
  }, [serverMessages, streamingContent, lastUserMessage, activeConversation?.id])

  const messageCount = serverMessages?.length ?? 0

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messageCount, streamingContent !== ''])

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus()
  }, [isStreaming])

  useEffect(() => {
    setLastUserMessage('')
  }, [activeConversation])

  useEffect(() => {
    if (lastUserMessage && serverMessages?.some(m => m.role === 'user' && m.content.trim() === lastUserMessage.trim())) {
      setLastUserMessage('')
    }
  }, [serverMessages, lastUserMessage])

  const sendMessage = useCallback(() => {
    const text = draft.trim()
    if (!text || !activeConversation || isStreaming) return

    setLastUserMessage(text)
    setDraft('')
    setIsStreaming(true)
    setStreamingContent('')

    const controller = chatbotApi.streamMessage(
      activeConversation.id,
      { message: text },
      (token) => {
        setStreamingContent((prev) => prev + token)
      },
      () => {
        setIsStreaming(false)
        setStreamingContent('')
        queryClient.invalidateQueries({ queryKey: ['chatMessages', activeConversation.id] })
        queryClient.invalidateQueries({ queryKey: ['chatConversations'] })
      },
      (error) => {
        setIsStreaming(false)
        setStreamingContent('')
        toast.error(error.message || 'Failed to get response')
      },
    )
    abortControllerRef.current = controller
  }, [draft, activeConversation, isStreaming, queryClient])

  const handleDeleteThread = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const handleNewChat = useCallback(() => {
    if (isStreaming) abortControllerRef.current?.abort()
    createMutation.mutate()
  }, [createMutation, isStreaming])

  return (
    <div className="fha-root">
      <div className="fha-threads">
        <button type="button" className="fha-new-chat" onClick={handleNewChat} disabled={createMutation.isPending}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          {createMutation.isPending ? 'Creating...' : 'New Chat'}
        </button>
        <div className="fha-thread-list">
          {conversationsLoading ? (
            <div className="fha-spinner" />
          ) : (
            conversations?.map((conv) => (
              <div
                key={conv.id}
                className={`fha-thread${activeConversation?.id === conv.id ? ' fha-active' : ''}`}
                onClick={() => {
                  if (isStreaming) return
                  setActiveConversation(conv)
                }}
              >
                <span className="fha-thread-title">{conv.title}</span>
                {conv.lastMessage && <span className="fha-thread-sub">{conv.lastMessage}</span>}
                <button
                  type="button"
                  className="fha-thread-delete"
                  aria-label="Delete conversation"
                  onClick={(e) => handleDeleteThread(e, conv.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="fha-chat-col">
        {!activeConversation ? (
          <div className="fha-empty">
            <div className="fha-empty-icon">
              <svg viewBox="0 0 24 24"><rect x="4.5" y="7.5" width="15" height="11" rx="3" /><path d="M9 12.5v.01M15 12.5v.01" /></svg>
            </div>
            <div className="fha-empty-text">No conversation selected</div>
            <div className="fha-empty-sub">Start a new chat or pick a conversation from the sidebar</div>
          </div>
        ) : (
          <>
            <div className="fha-messages" ref={scrollRef}>
              {messagesLoading ? (
                <div className="fha-spinner" />
              ) : (
                displayMessages.map((msg) => {
                  if (msg.role.toLowerCase() === 'user') {
                    return (
                      <div className="fha-msg-row fha-user" key={msg.id}>
                        <div className="fha-bubble">{msg.content}</div>
                        <span className="fha-msg-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id || 'streaming'}>
                      {msg.sources && msg.sources.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                          {msg.sources.map((s, j) => (
                            <div className="fha-source-card" key={`${msg.id}-src-${j}`}>
                              <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /></svg>
                              <span className="fha-source-text">{s.filename} — {s.excerpt}</span>
                              <span className="fha-source-pct">{Math.round(s.relevanceScore * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      ) : msg.id > 0 ? (
                        <div className="fha-no-sources">No documents matched your question — answering from general knowledge</div>
                      ) : null}
                      <div className="fha-msg-row fha-ai">
                        <div className="fha-bubble">
                          <div className="fha-ai-avatar">
                            <svg viewBox="0 0 24 24"><rect x="4.5" y="7.5" width="15" height="11" rx="3" /><path d="M9 12.5v.01M15 12.5v.01" /></svg>
                          </div>
                          <div className="fha-ai-content">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                        <span className="fha-msg-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  )
                })
              )}
              {isStreaming && !streamingContent && (
                <div className="fha-thinking">
                  <div className="fha-thinking-dot" />
                  <div className="fha-thinking-dot" />
                  <div className="fha-thinking-dot" />
                </div>
              )}
            </div>

            <div className="fha-input-row">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a question about your finances..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isStreaming}
              />
              <button
                type="button"
                className="fha-send-btn"
                onClick={sendMessage}
                disabled={!draft.trim() || isStreaming}
              >
                <svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
