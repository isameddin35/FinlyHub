import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportApi } from '@/api/reports'
import type { ReportResponse, ReportSummaryResponse } from '@/types/report'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Line } from 'recharts'
import { FileText, Download, Sparkles, TrendingUp, Calendar } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']

const REPORT_TYPES = ['Revenue', 'Expense', 'Profit', 'Cash Flow']
const REPORT_SUBTYPES = ['Monthly', 'Quarterly', 'Annual', 'Category Breakdown', 'Vendor Breakdown']

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  COMPLETED: 'success',
  PROCESSING: 'warning',
  FAILED: 'destructive',
}

interface PieDataItem {
  name: string
  value: number
}

interface BarDataItem {
  name: string
  amount: number
  [key: string]: unknown
}

function getChartType(report: ReportResponse): 'pie' | 'bar' {
  const config = report.chartConfig as Record<string, string> | null
  if (config?.type === 'pie' || config?.type === 'bar') return config.type
  const data = report.data as Record<string, unknown>
  if (Array.isArray(data.categories) || Array.isArray(data.vendors)) return 'pie'
  return 'bar'
}

function getPieChartData(report: ReportResponse): PieDataItem[] {
  const data = report.data as Record<string, unknown>
  const items = (data.categories || data.vendors || []) as Array<Record<string, unknown>>
  return items.map((item) => ({
    name: String(item.name ?? ''),
    value: Number(item.amount ?? item.value ?? 0),
  }))
}

function getBarChartData(report: ReportResponse): BarDataItem[] {
  const data = report.data as Record<string, unknown>
  const series = (data.series || data.monthly || data.quarterly || data.annual || []) as Array<Record<string, unknown>>
  return series.map((item) => {
    const name = String(item.period || item.month || item.quarter || item.year || '')
    const amount = Number(item.amount ?? item.revenue ?? item.total ?? item.value ?? 0)
    return { name, amount, ...item }
  })
}

function getAvailableKeys(data: BarDataItem[]): string[] {
  if (data.length === 0) return ['amount']
  const keys = new Set<string>()
  data.forEach((item) => {
    Object.keys(item).forEach((k) => {
      if (k !== 'name' && typeof item[k] === 'number') keys.add(k)
    })
  })
  return Array.from(keys).slice(0, 3)
}

function ReportEmptyState() {
  return (
    <Card className="flex h-full items-center justify-center">
      <CardContent className="pt-6 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No report selected</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a report to get started
        </p>
      </CardContent>
    </Card>
  )
}

function ReportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  )
}

function ReportErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  )
}

function PieChartView({ data }: { data: PieDataItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No chart data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function BarChartView({ data }: { data: BarDataItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No chart data available
      </div>
    )
  }

  const keys = getAvailableKeys(data)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v: number) => formatCurrency(v)} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        {keys.map((key, index) => (
          <Bar key={key} dataKey={key} fill={PIE_COLORS[index % PIE_COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function AiInsightsCard({ insight }: { insight: string | null }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insight ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{insight}</p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>No insights available for this report</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReportDetailView({ report }: { report: ReportResponse }) {
  const chartType = getChartType(report)
  const pieData = getPieChartData(report)
  const barData = getBarChartData(report)

  const handleExport = async (format: string) => {
    try {
      const response = await reportApi.export(report.id, format)
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${report.id}.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Report exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Failed to export report')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">{report.title}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{report.type}</Badge>
              <Badge variant="outline">{report.subtype}</Badge>
              <Badge variant={STATUS_VARIANT[report.status] ?? 'secondary'}>{report.status}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
              </span>
              <span>Created {formatDate(report.createdAt)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Data</CardTitle>
        </CardHeader>
        <CardContent>
          {chartType === 'pie' ? (
            <PieChartView data={pieData} />
          ) : (
            <BarChartView data={barData} />
          )}
        </CardContent>
      </Card>

      <AiInsightsCard insight={report.aiInsights} />
    </div>
  )
}

export function ReportsPage() {
  const queryClient = useQueryClient()

  const [reportType, setReportType] = useState('')
  const [subtype, setSubtype] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)

  const { data: listResponse, isLoading: isLoadingList, error: listError } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await reportApi.list()
      return res.data
    },
  })

  const { data: reportResponse, isLoading: isLoadingReport, error: reportError } = useQuery({
    queryKey: ['report', selectedReportId],
    queryFn: async () => {
      if (!selectedReportId) return null
      const res = await reportApi.getById(selectedReportId)
      return res.data
    },
    enabled: !!selectedReportId,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await reportApi.generate({
        type: reportType,
        subtype,
        periodStart,
        periodEnd,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report generated successfully')
      setReportType('')
      setSubtype('')
      setPeriodStart('')
      setPeriodEnd('')
    },
    onError: () => {
      toast.error('Failed to generate report')
    },
  })

  const reports = listResponse?.data ?? []
  const report = reportResponse?.data ?? null

  const canGenerate = reportType && subtype && periodStart && periodEnd

  return (
    <div className="flex h-full gap-6">
      <div className="w-80 shrink-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-subtype">Subtype</Label>
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger id="report-subtype">
                  <SelectValue placeholder="Select subtype" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_SUBTYPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-start">Start Date</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-end">End Date</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              disabled={!canGenerate || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingList ? (
              <div className="space-y-2 p-4 pt-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : listError ? (
              <p className="p-4 pt-0 text-sm text-destructive">Failed to load reports</p>
            ) : reports.length === 0 ? (
              <p className="p-4 pt-0 text-sm text-muted-foreground">No reports yet</p>
            ) : (
              <div className="divide-y">
                {reports.map((r: ReportSummaryResponse) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedReportId === r.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{r.title}</span>
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'} className="shrink-0 ml-2">
                        {r.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{r.type}</span>
                      <span>·</span>
                      <span>{r.subtype}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(r.periodStart)} - {formatDate(r.periodEnd)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator orientation="vertical" className="h-auto" />

      <div className="flex-1 min-w-0 overflow-auto">
        {!selectedReportId ? (
          <ReportEmptyState />
        ) : isLoadingReport ? (
          <ReportSkeleton />
        ) : reportError ? (
          <ReportErrorState message="Failed to load report details" />
        ) : report ? (
          <ReportDetailView report={report} />
        ) : null}
      </div>
    </div>
  )
}
