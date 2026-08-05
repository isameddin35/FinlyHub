import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubMatchRecords } from '../FinlyHubMatchRecords'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { ReconciliationResponse, ReconciliationMatchResponse, ReconciliationEntryResponse } from '@/types/reconciliation'

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
import toast from 'react-hot-toast'

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

  it('renders the CSV template download link', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Download CSV template')).toBeTruthy()
    })
  })

  it('renders counts and COMPLETED status on cards', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([
      mockRecon({ id: 1, title: 'Jan 2026', status: 'COMPLETED', matchedCount: 3, unmatchedCount: 1, needsReviewCount: 2, discrepancyAmount: 12.34 }),
    ]))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeTruthy()
      expect(screen.getByText('3 matched')).toBeTruthy()
      expect(screen.getByText('2 needs review')).toBeTruthy()
      expect(screen.getByText('1 unmatched')).toBeTruthy()
      expect(screen.getByText('$12.34 diff')).toBeTruthy()
    })
  })

  it('loads and renders reconciliation detail on card click', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([mockRecon({ id: 1, title: 'Jan 2026' })]))
    vi.mocked(reconciliationApi.getById).mockResolvedValue(mockApiResponse(mockDetail()))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Jan 2026')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Jan 2026'))
    await waitFor(() => {
      expect(reconciliationApi.getById).toHaveBeenCalledWith(1)
      expect(screen.getByText('Matched')).toBeTruthy()
      expect(screen.getByText('Needs Review')).toBeTruthy()
      expect(screen.getByText('Unmatched')).toBeTruthy()
      expect(screen.getAllByText('Acme Co').length).toBeGreaterThan(0)
      expect(screen.getByText('Approve')).toBeTruthy()
    })
  })

  it('approves a reconciliation from the detail panel', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([mockRecon({ id: 1, title: 'Jan 2026', status: 'COMPLETED' })]))
    vi.mocked(reconciliationApi.getById).mockResolvedValue(mockApiResponse(mockDetail()))
    vi.mocked(reconciliationApi.approve).mockResolvedValue(mockApiResponse(undefined))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Jan 2026')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Jan 2026'))
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Approve'))
    await waitFor(() => {
      expect(reconciliationApi.approve).toHaveBeenCalledWith(1)
      expect(toast.success).toHaveBeenCalledWith('Reconciliation approved')
    })
  })

  it('hides the approve button for already-approved reconciliations', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([mockRecon({ id: 1, title: 'Jan 2026', status: 'APPROVED' })]))
    vi.mocked(reconciliationApi.getById).mockResolvedValue(mockApiResponse(mockDetail({ status: 'APPROVED' })))
    renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Jan 2026')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Jan 2026'))
    await waitFor(() => {
      expect(screen.getByText('Matched')).toBeTruthy()
    })
    expect(screen.queryByText('Approve')).toBeNull()
  })

  it('surfaces the backend error message when matching fails', async () => {
    vi.mocked(reconciliationApi.list).mockResolvedValue(mockApiResponse([]))
    vi.mocked(reconciliationApi.match).mockRejectedValue({
      response: { data: { message: 'No data rows found in bank statement file' } },
    })
    const { container } = renderWithQuery(<FinlyHubMatchRecords />)
    await waitFor(() => {
      expect(screen.getByText('Reconciliation Details')).toBeTruthy()
    })

    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
    fireEvent.change(fileInputs[0], { target: { files: [new File(['b'], 'bank.csv')] } })
    fireEvent.change(fileInputs[1], { target: { files: [new File(['a'], 'acct.csv')] } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Monthly Bank Reconciliation'), { target: { value: 'Jan' } })
    fireEvent.change(screen.getByText('Period Start').nextElementSibling as HTMLInputElement, { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByText('Period End').nextElementSibling as HTMLInputElement, { target: { value: '2026-01-31' } })

    fireEvent.click(screen.getByText('Start Matching'))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No data rows found in bank statement file')
    })
  })
})

function mockEntry(overrides: Partial<ReconciliationEntryResponse> = {}): ReconciliationEntryResponse {
  return {
    id: 1,
    source: 'BANK',
    transactionDate: '2026-01-10',
    description: 'Acme Co',
    amount: 100,
    reference: 'REF1',
    matchedEntryId: null,
    matchStatus: 'MATCHED',
    matchScore: 0.95,
    amountDifference: 0,
    dateDifferenceDays: 0,
    ...overrides,
  }
}

function mockDetail(overrides: Partial<ReconciliationResponse> = {}): ReconciliationMatchResponse {
  return {
    reconciliation: mockRecon({ status: 'COMPLETED', ...overrides }),
    matched: [
      mockEntry({ id: 1, source: 'BANK', description: 'Acme Co', matchStatus: 'MATCHED' }),
      mockEntry({ id: 2, source: 'ACCOUNTING', description: 'Acme Co', matchedEntryId: 1, matchStatus: 'MATCHED' }),
    ],
    needsReview: [
      mockEntry({ id: 3, source: 'BANK', description: 'Fuzzy Match', matchStatus: 'NEEDS_REVIEW', matchScore: 0.6, amountDifference: 2, reference: null }),
    ],
    unmatched: [
      mockEntry({ id: 4, source: 'BANK', description: 'No Partner', matchStatus: 'UNMATCHED', amountDifference: null, reference: null }),
    ],
  }
}
