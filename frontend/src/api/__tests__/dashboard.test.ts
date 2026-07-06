import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dashboardApi } from '@/api/dashboard'
import apiClient from '@/api/client'

vi.mock('@/api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('dashboardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getMetrics fetches from /dashboard/metrics', async () => {
    const mockGet = vi.mocked(apiClient.get)
    const mockResponse = {
      data: {
        success: true,
        data: {
          invoicesProcessed: 10,
          documentsIndexed: 5,
          transactionsCategorized: 20,
          reconciliationsCompleted: 3,
          hoursSaved: 4.5,
          totalRevenue: 50000,
          totalExpenses: 30000,
          revenueTrend: [{ label: 'Jan', value: 5000 }],
          expenseTrend: [],
          recentActivity: [],
        },
      },
    }
    mockGet.mockResolvedValue(mockResponse)

    const result = await dashboardApi.getMetrics()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/metrics')
    expect(result.data.data.invoicesProcessed).toBe(10)
    expect(result.data.data.totalRevenue).toBe(50000)
  })
})
