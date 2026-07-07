import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatbotApi } from '@/api/chatbot'
import type { ConversationResponse, MessageResponse } from '@/types/chatbot'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bot, Send, Plus, MessageSquare, Trash2, FileText, Sparkles, StopCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTED_PROMPTS = [
  'What is the VAT rate?',
  'How should travel expenses be recorded?',
  'What is the reimbursement policy?',
  'Explain the revenue recognition process',
]

export function CopilotPage() {
  const queryClient = useQueryClient()
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: conversations, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatbotApi.listConversations(),
  })

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => chatbotApi.getMessages(activeConversationId!),
    enabled: !!activeConversationId,
  })

  const createMutation = useMutation({
    mutationFn: () => chatbotApi.createConversation(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setActiveConversationId(response.id)
    },
    onError: () => {
      toast.error('Failed to create conversation')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => chatbotApi.deleteConversation(id),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (deletedId === activeConversationId) {
        setActiveConversationId(null)
      }
    },
    onError: () => {
      toast.error('Failed to delete conversation')
    },
  })

  useEffect(() => {
    if (!isLoadingConversations && conversations && conversations.length === 0) {
      createMutation.mutate()
    }
  }, [isLoadingConversations, conversations?.length])

  useEffect(() => {
    if (!activeConversationId && conversations && conversations.length > 0) {
      setActiveConversationId(conversations[0].id)
    }
  }, [conversations, activeConversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pendingUserMessage])

  const handleSend = useCallback((messageText?: string) => {
    const msg = (messageText ?? input).trim()
    if (!msg || !activeConversationId || isStreaming) return
    setInput('')

    setPendingUserMessage(msg)
    setIsStreaming(true)
    setStreamingContent('')

    const abortController = chatbotApi.streamMessage(
      activeConversationId,
      { message: msg },
      (token) => {
        setStreamingContent((prev) => prev + token)
      },
      () => {
        setIsStreaming(false)
        setPendingUserMessage(null)
        setStreamingContent('')
        queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      },
      () => {
        setIsStreaming(false)
        setStreamingContent('')
        setPendingUserMessage(null)
        toast.error('Failed to get response')
      },
    )

    abortRef.current = abortController
  }, [activeConversationId, input, isStreaming, queryClient])

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setStreamingContent('')
    setPendingUserMessage(null)
    queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    if (!activeConversationId || isStreaming) return
    handleSend(prompt)
  }

  const handleNewChat = () => {
    createMutation.mutate()
  }

  const handleDeleteConversation = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    deleteMutation.mutate(id)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const allMessages = messages

  const renderMessage = (msg: MessageResponse) => (
    <div key={msg.id}>
      <div className={`flex gap-3 ${msg.role.toLowerCase() === 'user' ? 'flex-row-reverse' : ''}`}>
        {msg.role.toLowerCase() !== 'user' && (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        )}

        <div className={`max-w-[75%] ${msg.role.toLowerCase() === 'user' ? 'text-right' : ''}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role.toLowerCase() === 'user'
                ? 'bg-primary/10 text-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            }`}
          >
            {msg.content}
          </div>

          <div className="text-[10px] text-muted-foreground mt-1 px-1">
            {formatTime(msg.createdAt)}
          </div>

          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {msg.sources.map((source, idx) => (
                <Card key={idx} className="bg-card border shadow-sm">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate">
                        {source.filename}
                      </span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                        {(source.relevanceScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      &ldquo;{source.excerpt}&rdquo;
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-72 flex-shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full gap-2"
            variant="outline"
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoadingConversations ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : !conversations || conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors group relative ${
                    activeConversationId === conv.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {conv.title || 'New Chat'}
                      </div>
                      {conv.lastMessage && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {activeConversationId && !isLoadingConversations ? (
          <>
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-4 space-y-6">
                {isLoadingMessages ? (
                  <div className="space-y-4 pt-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}
                      >
                        {i % 2 === 0 && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="space-y-2 max-w-[80%]">
                          <Skeleton className="h-4 w-64" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-56" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : allMessages.length === 0 && !isStreaming ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Accounting Copilot</h2>
                    <p className="text-muted-foreground mb-8 max-w-md">
                      Ask me anything about accounting, financial policies, or document analysis.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSuggestedPrompt(prompt)}
                          className="text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-sm"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  allMessages.map(renderMessage)
                )}

                {isStreaming && pendingUserMessage && (
                  <div key="pending-user" className="flex gap-3 flex-row-reverse">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary/10 text-foreground rounded-tr-sm max-w-[75%]"
                    >
                      {pendingUserMessage}
                    </div>
                  </div>
                )}

                {isStreaming && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="max-w-[75%]">
                      <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-muted text-foreground rounded-tl-sm">
                        {streamingContent || (
                          <div className="flex gap-1 items-center h-5">
                            <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t bg-background p-4">
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your finances..."
                    disabled={isStreaming}
                    className="flex-1"
                  />
                  {isStreaming ? (
                    <Button onClick={handleStop} variant="destructive" size="icon">
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim()}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Accounting Copilot</h2>
              <p className="text-muted-foreground">Start a new conversation to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
