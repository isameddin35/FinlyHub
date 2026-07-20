import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import type { DashboardMetricsResponse, ChartDataPoint, ActivityItem } from '@/types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { FileText, FileSearch, ArrowLeftRight, Receipt, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
function timeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function mergeTrendData(
  revenue: ChartDataPoint[],
  expenses: ChartDataPoint[]
): { label: string; revenue: number; expenses: number }[] {
  const map = new Map<string, { revenue: number; expenses: number }>()

  for (const point of revenue) {
    map.set(point.label, { revenue: point.value, expenses: 0 })
  }
  for (const point of expenses) {
    const existing = map.get(point.label)
    if (existing) {
      existing.expenses = point.value
    } else {
      map.set(point.label, { revenue: 0, expenses: point.value })
    }
  }

  return Array.from(map.entries()).map(([label, values]) => ({
    label,
    ...values,
  }))
}

function activityIcon(type: string) {
  switch (type) {
    case 'INVOICE':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'TRANSACTION':
      return <ArrowLeftRight className="h-4 w-4 text-emerald-500" />
    case 'RECONCILIATION':
      return <Receipt className="h-4 w-4 text-amber-500" />
    default:
      return <FileSearch className="h-4 w-4 text-muted-foreground" />
  }
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
  trendLabel?: string
}

function MetricCard({ icon, label, value, trend, trendLabel }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={trend >= 0 ? 'text-emerald-500' : 'text-red-500'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  )
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const labels = {
    dashboard: 'Dashboard',
    financialOverview: 'Your financial overview at a glance',
    invoicesProcessed: 'Invoices Processed',
    documentsIndexed: 'Documents Indexed',
    transactionsCategorized: 'Transactions Categorized',
    reconciliations: 'Reconciliations',
    hoursSaved: 'Hours Saved',
    revenueVsExpenses: 'Revenue vs Expenses',
    revenue: 'Revenue',
    expenses: 'Expenses',
    recentActivity: 'Recent Activity',
  }
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async () => {
      const response = await dashboardApi.getMetrics()
      return response.data.data
    },
  })

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <MetricCardsSkeleton />
        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-3">
            <ActivitySkeleton />
          </div>
        </div>
      </div>
    )
  }

  const chartData = mergeTrendData(data.revenueTrend, data.expenseTrend)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{labels.dashboard}</h1>
          <p className="text-sm text-muted-foreground">{labels.financialOverview}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label={labels.invoicesProcessed}
          value={data.invoicesProcessed.toLocaleString()}
          trend={12.5}
          trendLabel="vs last month"
        />
        <MetricCard
          icon={<FileSearch className="h-4 w-4" />}
          label={labels.documentsIndexed}
          value={data.documentsIndexed.toLocaleString()}
          trend={8.3}
          trendLabel="vs last month"
        />
        <MetricCard
          icon={<ArrowLeftRight className="h-4 w-4" />}
          label={labels.transactionsCategorized}
          value={data.transactionsCategorized.toLocaleString()}
          trend={-2.1}
          trendLabel="vs last month"
        />
        <MetricCard
          icon={<Receipt className="h-4 w-4" />}
          label={labels.reconciliations}
          value={data.reconciliationsCompleted.toLocaleString()}
          trend={15.0}
          trendLabel="vs last month"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label={labels.hoursSaved}
          value={data.hoursSaved.toLocaleString()}
          trend={22.4}
          trendLabel="vs last month"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{labels.revenueVsExpenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  className="text-xs text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={labels.revenue}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={labels.expenses}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">{labels.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {data.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {activityIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
