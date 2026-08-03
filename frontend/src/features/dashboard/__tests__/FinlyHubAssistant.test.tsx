import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubAssistant } from '../FinlyHubAssistant'
import type { ConversationResponse, MessageResponse } from '@/types/chatbot'

vi.mock('@/api/chatbot', () => ({
  chatbotApi: {
    listConversations: vi.fn(),
    getMessages: vi.fn(),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    streamMessage: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { chatbotApi } from '@/api/chatbot'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockConv = (overrides: Partial<ConversationResponse> = {}): ConversationResponse => ({
  id: 1,
  title: 'Q1 Review',
  isActive: true,
  lastMessage: 'What was our revenue?',
  messageCount: 3,
  createdAt: '2026-07-15T10:00:00',
  updatedAt: '2026-07-15T10:05:00',
  ...overrides,
})

const mockMessage = (overrides: Partial<MessageResponse> = {}): MessageResponse => ({
  id: 1,
  conversationId: 1,
  role: 'user',
  content: 'What was our revenue?',
  sources: null,
  confidenceScore: null,
  createdAt: '2026-07-15T10:00:00',
  ...overrides,
})

describe('FinlyHubAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no conversation selected', async () => {
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('No conversation selected')).toBeTruthy()
      expect(screen.getByText('Start a new chat or pick a conversation from the sidebar')).toBeTruthy()
    })
  })

  it('renders the new chat button', async () => {
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('New Chat')).toBeTruthy()
    })
  })

  it('renders conversation list in sidebar', async () => {
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([mockConv(), mockConv({ id: 2, title: 'Expense Report' })])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Q1 Review')).toBeTruthy()
      expect(screen.getByText('Expense Report')).toBeTruthy()
    })
  })

  it('shows delete buttons on conversations', async () => {
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([mockConv()])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      const deleteBtns = screen.getAllByLabelText('Delete conversation')
      expect(deleteBtns.length).toBe(1)
    })
  })

  it('renders messages when a conversation is active', async () => {
    const conv = mockConv()
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([conv])
    vi.mocked(chatbotApi.getMessages).mockResolvedValue([
      mockMessage({ id: 1, role: 'user', content: 'What was our revenue?' }),
      mockMessage({ id: 2, role: 'assistant', content: 'Your revenue was $125,000.' }),
    ])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Q1 Review')).toBeTruthy()
    })
    await userEvent.click(screen.getByText('Q1 Review'))
    await waitFor(() => {
      expect(screen.getAllByText('What was our revenue?').length).toBe(2)
      expect(screen.getByText('Your revenue was $125,000.')).toBeTruthy()
    })
  })

  it('shows no-sources hint when assistant message has no sources', async () => {
    const conv = mockConv()
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([conv])
    vi.mocked(chatbotApi.getMessages).mockResolvedValue([
      mockMessage({ id: 1, role: 'user', content: 'Anything in docs?' }),
      mockMessage({ id: 2, role: 'assistant', content: 'No documents matched.' }),
    ])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Q1 Review')).toBeTruthy()
    })
    await userEvent.click(screen.getByText('Q1 Review'))
    await waitFor(() => {
      expect(screen.getByText('No documents matched your question — answering from general knowledge')).toBeTruthy()
    })
  })

  it('renders source cards when assistant message has sources', async () => {
    const conv = mockConv()
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([conv])
    vi.mocked(chatbotApi.getMessages).mockResolvedValue([
      mockMessage({ id: 1, role: 'user', content: 'What was our revenue?' }),
      mockMessage({
        id: 2,
        role: 'assistant',
        content: 'Your revenue was $125,000.',
        sources: [{ documentId: 5, filename: 'q1_report.pdf', excerpt: 'Revenue section', relevanceScore: 0.87, chunkIndex: 2 }],
      }),
    ])
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Q1 Review')).toBeTruthy()
    })
    await userEvent.click(screen.getByText('Q1 Review'))
    await waitFor(() => {
      expect(screen.getByText('q1_report.pdf — Revenue section')).toBeTruthy()
      expect(screen.getByText('87%')).toBeTruthy()
      expect(screen.queryByText('No documents matched your question — answering from general knowledge')).toBeNull()
    })
  })

  it('passes selected document type filter to streamMessage', async () => {
    const conv = mockConv()
    vi.mocked(chatbotApi.listConversations).mockResolvedValue([conv])
    vi.mocked(chatbotApi.getMessages).mockResolvedValue([])
    vi.mocked(chatbotApi.streamMessage).mockImplementation((_id, _data, _onToken, onDone) => {
      onDone(mockMessage({ id: 2, role: 'assistant', content: 'Ok.' }))
      return { abort: vi.fn() } as any
    })
    renderWithQuery(<FinlyHubAssistant />)
    await waitFor(() => {
      expect(screen.getByText('Q1 Review')).toBeTruthy()
    })
    await userEvent.click(screen.getByText('Q1 Review'))
    const select = screen.getByLabelText('Filter by document type') as HTMLSelectElement
    await userEvent.selectOptions(select, 'INVOICE')
    await userEvent.type(screen.getByPlaceholderText('Ask a question about your finances...'), 'how are invoices handled{enter}')
    await waitFor(() => {
      expect(chatbotApi.streamMessage).toHaveBeenCalledWith(
        1,
        { message: 'how are invoices handled', documentType: 'INVOICE' },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      )
    })
  })
})
