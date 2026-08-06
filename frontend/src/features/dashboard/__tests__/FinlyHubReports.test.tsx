import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  type: 'PROFIT',
  subtype: 'MONTHLY',
  status: 'COMPLETED',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
  createdAt: '2026-04-01T10:00:00',
  ...overrides,
})

const mockReport = (overrides: Partial<ReportResponse> = {}): ReportResponse => ({
  id: 1,
  title: 'P&L Q1 2026',
  type: 'PROFIT',
  subtype: 'MONTHLY',
  data: { totalRevenue: 125000, totalExpense: 89000, netProfit: 36000 },
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
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
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
      expect(screen.getAllByText('Generate Report')).toHaveLength(2)
      expect(screen.getByText('Report Type')).toBeTruthy()
      expect(screen.getByText('Balance Sheet')).toBeTruthy()
      expect(screen.getByText('Start Date')).toBeTruthy()
      expect(screen.getByText('End Date')).toBeTruthy()
    })
  })

  it('shows saved reports list with status badges', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([
      mockReportSummary(),
      mockReportSummary({ id: 2, title: 'Balance Sheet Q1', status: 'GENERATING' }),
    ]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('Saved Reports')).toBeTruthy()
      expect(screen.getByText('P&L Q1 2026')).toBeTruthy()
      expect(screen.getByText('Balance Sheet Q1')).toBeTruthy()
      expect(screen.getAllByText('COMPLETED').length).toBeGreaterThan(0)
      expect(screen.getByText('GENERATING')).toBeTruthy()
    })
  })

  it('shows empty saved reports message', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeTruthy()
    })
  })

  it('generates a report with backend enum values and renders the preview', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    vi.mocked(reportApi.generate).mockResolvedValue(mockApiResponse(mockReport()))
    vi.mocked(reportApi.getById).mockResolvedValue(mockApiResponse(mockReport()))
    const { container } = renderWithQuery(<FinlyHubReports />)

    await waitFor(() => {
      expect(screen.getByText('No report selected')).toBeTruthy()
    })

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'PROFIT' } })
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[1].children.length).toBeGreaterThan(1)
    })
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'MONTHLY' } })
    const dateInputs = container.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } })
    fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } })

    fireEvent.click(screen.getAllByText('Generate Report').find((el) => el.tagName === 'BUTTON')!)

    await waitFor(() => {
      expect(reportApi.generate).toHaveBeenCalledWith({
        type: 'PROFIT',
        subtype: 'MONTHLY',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      })
      expect(screen.getByText('Total Revenue')).toBeTruthy()
      expect(screen.getByText('Revenue grew 12% this quarter.')).toBeTruthy()
    })
  })

  it('shows spinner while selected report is generating', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([mockReportSummary({ status: 'GENERATING' })]))
    vi.mocked(reportApi.getById).mockResolvedValue(mockApiResponse(mockReport({ status: 'GENERATING', data: {} })))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('GENERATING')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('P&L Q1 2026'))
    await waitFor(() => {
      expect(reportApi.getById).toHaveBeenCalledWith(1)
    })
  })

  it('exports the report as PDF and Excel', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([mockReportSummary()]))
    vi.mocked(reportApi.getById).mockResolvedValue(mockApiResponse(mockReport()))
    vi.mocked(reportApi.export).mockResolvedValue(mockApiResponse(new Blob()) as never)
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('P&L Q1 2026')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('P&L Q1 2026'))
    await waitFor(() => {
      expect(screen.getByText('Export PDF')).toBeTruthy()
      expect(screen.getByText('Export Excel')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Export PDF'))
    fireEvent.click(screen.getByText('Export Excel'))
    await waitFor(() => {
      expect(reportApi.export).toHaveBeenCalledWith(1, 'PDF')
      expect(reportApi.export).toHaveBeenCalledWith(1, 'EXCEL')
    })
  })

  it('renders stat cards without a chart when chartConfig.labels is null', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([mockReportSummary({ type: 'PROFIT' })]))
    vi.mocked(reportApi.getById).mockResolvedValue(mockApiResponse(mockReport({
      chartConfig: {
        type: 'bar',
        labels: null,
        datasets: [{ label: 'PROFIT', data: null }],
      },
    })))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('P&L Q1 2026')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('P&L Q1 2026'))
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeTruthy()
      expect(screen.getByText('Total Expense')).toBeTruthy()
      expect(screen.getByText('Net Profit')).toBeTruthy()
      expect(screen.queryByText('Trend')).toBeNull()
    })
    expect(document.querySelector('.recharts-surface')).toBeNull()
  })

  it('shows a chart when chartConfig is present', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([mockReportSummary()]))
    vi.mocked(reportApi.getById).mockResolvedValue(mockApiResponse(mockReport({
      chartConfig: {
        type: 'bar',
        labels: ['2026-01', '2026-02'],
        datasets: [{ label: 'PROFIT', data: [1000, 2000] }],
      },
    })))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('P&L Q1 2026')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('P&L Q1 2026'))
    await waitFor(() => {
      expect(document.querySelector('.recharts-surface')).toBeTruthy()
      expect(screen.getByText('Trend')).toBeTruthy()
    })
  })

  it('shows a failure state for failed reports', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([mockReportSummary({ status: 'FAILED' })]))
    vi.mocked(reportApi.getById).mockResolvedValue(mockApiResponse(mockReport({ status: 'FAILED', data: {} })))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getByText('FAILED')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('P&L Q1 2026'))
    await waitFor(() => {
      expect(screen.getByText('Report generation failed. Try generating it again.')).toBeTruthy()
    })
  })

  it('renders the generate button', async () => {
    vi.mocked(reportApi.list).mockResolvedValue(mockApiResponse([]))
    renderWithQuery(<FinlyHubReports />)
    await waitFor(() => {
      expect(screen.getAllByText('Generate Report')).toHaveLength(2)
    })
  })
})
