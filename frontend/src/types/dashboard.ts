export interface DashboardMetricsResponse {
  invoicesProcessed: number
  documentsIndexed: number
  transactionsCategorized: number
  reconciliationsCompleted: number
  hoursSaved: number
  totalRevenue: number
  totalExpenses: number
  revenueTrend: ChartDataPoint[]
  expenseTrend: ChartDataPoint[]
  recentActivity: ActivityItem[]
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface ActivityItem {
  id: number
  type: string
  title: string
  description: string
  timestamp: string
}
