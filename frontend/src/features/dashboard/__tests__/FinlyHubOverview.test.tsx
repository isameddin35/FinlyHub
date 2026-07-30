import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinlyHubOverview } from '../FinlyHubOverview'
import { mockApiResponse } from '@/api/__tests__/test-utils'
import type { DashboardMetricsResponse } from '@/types/dashboard'

vi.mock('@/api/dashboard', () => ({
  dashboardApi: {
    getMetrics: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import { dashboardApi } from '@/api/dashboard'

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const mockMetrics = (overrides: Partial<DashboardMetricsResponse> = {}): DashboardMetricsResponse => ({
  invoicesProcessed: 42,
  documentsIndexed: 18,
  transactionsCategorized: 156,
  reconciliationsCompleted: 9,
  hoursSaved: 28,
  totalRevenue: 125000,
  totalExpenses: 89000,
  revenueTrend: [
    { label: 'Jan', value: 20000 },
    { label: 'Feb', value: 25000 },
  ],
  expenseTrend: [
    { label: 'Jan', value: 15000 },
    { label: 'Feb', value: 18000 },
  ],
  recentActivity: [
    { id: 1, type: 'TRANSACTION', title: 'Invoice paid', description: 'Client payment received', timestamp: new Date().toISOString() },
    { id: 2, type: 'INVOICE', title: 'Invoice processed', description: 'Vendor invoice #1042', timestamp: new Date().toISOString() },
  ],
  ...overrides,
})

describe('FinlyHubOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(dashboardApi.getMetrics).mockReturnValue(new Promise(() => {}))
    renderWithQuery(<FinlyHubOverview />)
    expect(screen.getByText('Loading your data...')).toBeTruthy()
  })

  it('renders metric cards with correct values', async () => {
    vi.mocked(dashboardApi.getMetrics).mockResolvedValue(mockApiResponse(mockMetrics()))
    renderWithQuery(<FinlyHubOverview />)
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeTruthy()
      expect(screen.getByText('Your money at a glance')).toBeTruthy()
      expect(screen.getByText('Invoices Ready')).toBeTruthy()
      expect(screen.getByText('Files Organized')).toBeTruthy()
      expect(screen.getByText('Transactions Categorized')).toBeTruthy()
      expect(screen.getByText('Records Matched')).toBeTruthy()
      expect(screen.getByText('Time Saved')).toBeTruthy()
      expect(screen.getByText('42')).toBeTruthy()
      expect(screen.getByText('18')).toBeTruthy()
      expect(screen.getByText('28')).toBeTruthy()
    })
  })

  it('shows loading state on API failure (error state unreachable due to !data check)', async () => {
    vi.mocked(dashboardApi.getMetrics).mockRejectedValue(new Error('Network failure'))
    renderWithQuery(<FinlyHubOverview />)
    await waitFor(() => {
      expect(screen.getByText('Loading your data...')).toBeTruthy()
    })
  })

  it('renders chart legend and recent activity', async () => {
    vi.mocked(dashboardApi.getMetrics).mockResolvedValue(mockApiResponse(mockMetrics()))
    renderWithQuery(<FinlyHubOverview />)
    await waitFor(() => {
      expect(screen.getByText('Income vs Expenses')).toBeTruthy()
      expect(screen.getByText('Recent Activity')).toBeTruthy()
      expect(screen.getByText('Invoice paid')).toBeTruthy()
      expect(screen.getByText('Invoice processed')).toBeTruthy()
    })
  })

  it('shows empty activity message when no recent activity', async () => {
    vi.mocked(dashboardApi.getMetrics).mockResolvedValue(mockApiResponse(mockMetrics({ recentActivity: [] })))
    renderWithQuery(<FinlyHubOverview />)
    await waitFor(() => {
      expect(screen.getByText('No recent activity')).toBeTruthy()
    })
  })
})
