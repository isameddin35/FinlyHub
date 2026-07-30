import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubSpending } from '../FinlyHubSpending'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { TransactionResponse } from '@/types/transaction'

vi.mock('@/api/transactions', () => ({
  transactionApi: {
    list: vi.fn(),
    getCategories: vi.fn(),
    import: vi.fn(),
    approve: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { transactionApi } from '@/api/transactions'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockTx = (overrides: Partial<TransactionResponse> = {}): TransactionResponse => ({
  id: 1,
  transactionDate: '2026-07-15',
  description: 'Office supplies',
  amount: 150.00,
  currency: 'USD',
  reference: null,
  vendor: null,
  source: 'IMPORTED',
  categoryId: null,
  categoryName: null,
  suggestedCategoryId: 2,
  suggestedCategoryName: 'Office Expenses',
  confidenceScore: 0.95,
  categorizationStatus: 'PENDING',
  userApproved: false,
  importBatchId: null,
  createdAt: '2026-07-15T10:00:00',
  ...overrides,
})

describe('FinlyHubSpending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockedTxApi = vi.mocked(transactionApi)
    mockedTxApi.getCategories.mockResolvedValue(mockApiResponse([]))
  })

  it('shows loading skeleton while fetching', () => {
    vi.mocked(transactionApi.list).mockReturnValue(new Promise(() => {}))
    renderWithQuery(<FinlyHubSpending />)
    const skeleton = document.querySelector('.animate-pulse')
    expect(skeleton).toBeTruthy()
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(transactionApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubSpending />)
    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeTruthy()
    })
  })

  it('renders transaction rows', async () => {
    vi.mocked(transactionApi.list).mockResolvedValue(mockApiResponse([mockTx()]))
    renderWithQuery(<FinlyHubSpending />)
    await waitFor(() => {
      expect(screen.getByText('Office supplies')).toBeTruthy()
      expect(screen.getByText('Office Expenses')).toBeTruthy()
    })
  })

  it('filters by tab', async () => {
    const pending = mockTx({ id: 1, description: 'Pending purchase', categorizationStatus: 'PENDING' })
    const approved = mockTx({ id: 2, description: 'Approved purchase', categorizationStatus: 'APPROVED', confidenceScore: null, categoryName: 'Office Expenses' })
    vi.mocked(transactionApi.list).mockResolvedValue(mockApiResponse([pending, approved]))

    renderWithQuery(<FinlyHubSpending />)

    await waitFor(() => {
      expect(screen.getByText('Pending purchase')).toBeTruthy()
      expect(screen.getByText('Approved purchase')).toBeTruthy()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Approved' }))
    await waitFor(() => {
      expect(screen.queryByText('Pending purchase')).toBeNull()
    })
  })

  it('shows retry on error', async () => {
    vi.mocked(transactionApi.list).mockRejectedValue(new Error('Network failure'))
    renderWithQuery(<FinlyHubSpending />)
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeTruthy()
    })
  })

  it('renders stats cards', async () => {
    vi.mocked(transactionApi.list).mockResolvedValue(mockApiResponse([mockTx()]))
    renderWithQuery(<FinlyHubSpending />)
    await waitFor(() => {
      expect(screen.getByText('Total Transactions')).toBeTruthy()
      expect(screen.getByText('Pending Review')).toBeTruthy()
      expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1)
    })
  })
})
