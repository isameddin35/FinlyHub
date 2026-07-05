export interface ReportRequest {
  type: string
  subtype: string
  periodStart: string
  periodEnd: string
  parameters?: Record<string, string>
}

export interface ReportResponse {
  id: number
  title: string
  type: string
  subtype: string
  data: Record<string, unknown>
  aiInsights: string | null
  chartConfig: Record<string, unknown> | null
  status: string
  periodStart: string
  periodEnd: string
  createdAt: string
}

export interface ReportSummaryResponse {
  id: number
  title: string
  type: string
  subtype: string
  status: string
  periodStart: string
  periodEnd: string
  createdAt: string
}
