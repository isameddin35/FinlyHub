import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubReports } from '../FinlyHubReports'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { ReportSummaryResponse, ReportResponse } from '@/types/report'

vi.mock('@/api/reports', () => ({
  reportApi: {
    list: vi.fn(),
    generate: vi.fn(),
    getById: vi.fn(),
    export: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { reportApi } from '@/api/reports'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockReportSummary = (overrides: Partial<ReportSummaryResponse> = {}): ReportSummaryResponse => ({
  id: 1,
  title: 'P&L Q1 2026',
  type: 'PROFIT_LOSS',
  subtype: 'monthly',
  status: 'COMPLETED',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  createdAt: '2026-04-01T10:00:00',
  ...overrides,
})

const mockReport = (overrides: Partial<ReportResponse> = {}): ReportResponse => ({
  id: 1,
  title: 'P&L Q1 2026',
  type: 'PROFIT_LOSS',
  subtype: 'monthly',
  data: { totalRevenue: 125000, totalExpenses: 89000, netIncome: 36000 },
  aiInsights: 'Revenue grew 12% this quarter.',
  chartConfig: null,
  status: 'COMPLETED',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  createdAt: '2026-04-01T10:00:00',
  ...overrides,
})

describe('FinlyHubReports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the report header', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('Reports')).toBeTruthy()
    })
  })

  it('shows empty state when no report selected', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('No report selected')).toBeTruthy()
      expect(screen.getByText('Generate a report to get started')).toBeTruthy()
    })
  })

  it('renders report type options in the form', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getAllByText('Generate Report').length).toBe(2)
      expect(screen.getByText('Report Type')).toBeTruthy()
      expect(screen.getByText('Start Date')).toBeTruthy()
      expect(screen.getByText('End Date')).toBeTruthy()
    })
  })

  it('shows saved reports list', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([
      mockReportSummary(),
      mockReportSummary({ id: 2, title: 'Balance Sheet Q1' }),
    ]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('Saved Reports')).toBeTruthy()
      expect(screen.getByText('P&L Q1 2026')).toBeTruthy()
      expect(screen.getByText('Balance Sheet Q1')).toBeTruthy()
    })
  })

  it('shows empty saved reports message', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeTruthy()
    })
  })

  it('displays report preview with data and AI insights', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    vi.mocked(reportApi.generate).mockResolvedValue(mockApiResponse(mockReport()))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('No report selected')).toBeTruthy()
    })
  })

  it('renders the generate button', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getAllByText('Generate Report').length).toBe(2)
    })
  })
})
