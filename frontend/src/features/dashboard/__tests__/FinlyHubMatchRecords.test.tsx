import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubMatchRecords } from '../FinlyHubMatchRecords'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { ReconciliationResponse } from '@/types/reconciliation'

vi.mock('@/api/reconciliation', () => ({
  reconciliationApi: {
    list: vi.fn(),
    match: vi.fn(),
    getById: vi.fn(),
    approve: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { reconciliationApi } from '@/api/reconciliation'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockRecon = (overrides: Partial<ReconciliationResponse> = {}): ReconciliationResponse => ({
  id: 1,
  title: 'Monthly Bank Reconciliation',
  status: 'IN_PROGRESS',
  totalBankTransactions: 120,
  totalAccountingTransactions: 115,
  matchedCount: 110,
  unmatchedCount: 10,
  needsReviewCount: 5,
  discrepancyAmount: 1250.50,
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  createdAt: '2026-07-01T10:00:00',
  ...overrides,
})

describe('FinlyHubMatchRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while fetching', () => {
    vi.mocked(reconciliationApi.list).mockReturnValue(new Promise(() => {}))
    renderWithQuery(<FinlyHubMatchRecords />)
    const spinner = document.querySelector('.fhm-spinner')
    expect(spinner).toBeTruthy()
  })

  it('renders the header', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Reconciliation')).toBeTruthy()
    })
  })

  it('shows empty state when no reconciliations', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('No reconciliations yet.')).toBeTruthy()
    })
  })

  it('renders reconciliation cards with titles', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([
      mockRecon(),
      mockRecon({ id: 2, title: 'July MTD', status: 'APPROVED' }),
    ]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Monthly Bank Reconciliation')).toBeTruthy()
      expect(screen.getByText('July MTD')).toBeTruthy()
      expect(screen.getByText('IN_PROGRESS')).toBeTruthy()
      expect(screen.getByText('APPROVED')).toBeTruthy()
    })
  })

  it('renders upload dropzones', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Bank Statement')).toBeTruthy()
      expect(screen.getByText('Accounting Records')).toBeTruthy()
    })
  })

  it('renders reconciliation details form', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Reconciliation Details')).toBeTruthy()
      expect(screen.getByText('Title')).toBeTruthy()
      expect(screen.getByText('Period Start')).toBeTruthy()
      expect(screen.getByText('Period End')).toBeTruthy()
    })
  })

  it('renders previous reconciliations section', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Previous Reconciliations')).toBeTruthy()
    })
  })
})
