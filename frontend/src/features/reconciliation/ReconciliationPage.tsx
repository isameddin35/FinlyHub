import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reconciliationApi } from '@/api/reconciliation'
import type { ReconciliationResponse, ReconciliationEntryResponse, ReconciliationMatchResponse } from '@/types/reconciliation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, CheckCircle, AlertCircle, XCircle, ArrowRight, ArrowLeft, Banknote, Ban, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'

type MatchStatus = 'matched' | 'unmatched' | 'needsReview'
type TabValue = MatchStatus | 'all'

const statusConfig = {
  matched: { label: 'Matched', icon: CheckCircle, variant: 'success' as const },
  unmatched: { label: 'Unmatched', icon: XCircle, variant: 'destructive' as const },
  needsReview: { label: 'Needs Review', icon: AlertCircle, variant: 'warning' as const },
}

function getStatusBadge(status: string) {
  const key = status.toLowerCase() as MatchStatus
  const config = statusConfig[key] || statusConfig.needsReview
  return { ...config, key }
}

function EntryRow({ entry }: { entry: ReconciliationEntryResponse }) {
  const { label, icon: Icon, variant } = getStatusBadge(entry.matchStatus)

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50">
      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{entry.description}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(entry.transactionDate)}
            {entry.reference && <span className="ml-2">Ref: {entry.reference}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular-nums font-medium">{formatCurrency(entry.amount)}</span>
        <Badge variant={variant}>{label}</Badge>
        {entry.matchScore !== null && (
          <span className="min-w-[3rem] text-right text-xs text-muted-foreground">
            {(entry.matchScore * 100).toFixed(0)}%
          </span>
        )}
        {entry.amountDifference !== null && entry.amountDifference !== 0 && (
          <span className={`min-w-[4rem] text-right text-xs tabular-nums ${entry.amountDifference > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {entry.amountDifference > 0 ? '+' : ''}{formatCurrency(entry.amountDifference)}
          </span>
        )}
      </div>
    </div>
  )
}

function EntryListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function UploadZone({ label, icon: Icon, onDrop, accept }: {
  label: string
  icon: typeof Upload
  onDrop: (files: File[]) => void
  accept: Record<string, string[]>
}) {
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
    >
      <input {...getInputProps()} />
      <Icon className="mb-2 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{label}</p>
      {acceptedFiles[0] ? (
        <p className="mt-1 text-xs text-muted-foreground">{acceptedFiles[0].name}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Drop file or click to browse</p>
      )}
    </div>
  )
}

function StatsCard({ label, value, variant }: { label: string; value: string | number; variant?: 'success' | 'destructive' | 'warning' | 'default' }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${
        variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
        variant === 'destructive' ? 'text-red-600 dark:text-red-400' :
        variant === 'warning' ? 'text-amber-600 dark:text-amber-400' :
        ''
      }`}>
        {value}
      </p>
    </div>
  )
}

export function ReconciliationPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('all')

  const [bankFile, setBankFile] = useState<File | null>(null)
  const [accountingFile, setAccountingFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: () => reconciliationApi.list(),
  })

  const reconciliations = listData?.data?.data ?? []

  const { data: detailData, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ['reconciliation', selectedId],
    queryFn: () => reconciliationApi.getById(selectedId!),
    enabled: selectedId !== null,
  })

  const matchResponse = detailData?.data?.data ?? null

  const matchMutation = useMutation({
    mutationFn: () => reconciliationApi.match(bankFile!, accountingFile!, title, periodStart, periodEnd),
    onSuccess: (res) => {
      toast.success('Reconciliation completed')
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
      if (res.data?.data?.id) {
        setSelectedId(res.data.data.id)
      }
      setBankFile(null)
      setAccountingFile(null)
      setTitle('')
      setPeriodStart('')
      setPeriodEnd('')
    },
    onError: () => toast.error('Reconciliation failed'),
  })

  const approveMutation = useMutation({
    mutationFn: () => reconciliationApi.approve(selectedId!),
    onSuccess: () => {
      toast.success('Reconciliation approved')
      queryClient.invalidateQueries({ queryKey: ['reconciliation', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] })
    },
    onError: () => toast.error('Failed to approve reconciliation'),
  })

  const allEntries = useMemo(() => {
    if (!matchResponse) return []
    return [
      ...matchResponse.matched.map(e => ({ ...e, _statusGroup: 'matched' as const })),
      ...matchResponse.unmatched.map(e => ({ ...e, _statusGroup: 'unmatched' as const })),
      ...matchResponse.needsReview.map(e => ({ ...e, _statusGroup: 'needsReview' as const })),
    ]
  }, [matchResponse])

  const filteredEntries = useMemo(() => {
    if (activeTab === 'all') return allEntries
    return allEntries.filter(e => e._statusGroup === activeTab)
  }, [allEntries, activeTab])

  const bankEntries = useMemo(() =>
    filteredEntries.filter(e => e.source === 'BANK'),
    [filteredEntries]
  )

  const accountingEntries = useMemo(() =>
    filteredEntries.filter(e => e.source === 'ACCOUNTING'),
    [filteredEntries]
  )

  const reconciliation = matchResponse?.reconciliation ?? null

  const canStartMatching = bankFile && accountingFile && title && periodStart && periodEnd

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const needsReviewCount = reconciliation?.needsReviewCount ?? 0
  const canApprove = selectedId && reconciliation?.status !== 'APPROVED' && needsReviewCount === 0

  if (listLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reconciliation</h1>
        {selectedId && reconciliation && (
          <div className="flex items-center gap-3">
            <Badge variant={reconciliation.status === 'APPROVED' ? 'success' : reconciliation.status === 'PENDING' ? 'warning' : 'default'}>
              {reconciliation.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </div>
        )}
      </div>

      {!selectedId ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <UploadZone
              label="Bank Statement"
              icon={Banknote}
              accept={{ 'text/csv': ['.csv'], 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }}
              onDrop={(files) => setBankFile(files[0])}
            />
            <UploadZone
              label="Accounting Records"
              icon={FileSpreadsheet}
              accept={{ 'text/csv': ['.csv'], 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }}
              onDrop={(files) => setAccountingFile(files[0])}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="e.g. Monthly Bank Reconciliation" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Period Start</Label>
                  <Input id="periodStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Period End</Label>
                  <Input id="periodEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>
              <Button className="mt-4" onClick={() => matchMutation.mutate()} disabled={!canStartMatching || matchMutation.isPending}>
                {matchMutation.isPending ? (
                  <>Matching...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Start Matching</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <div>
            <h2 className="mb-4 text-lg font-semibold">Previous Reconciliations</h2>
            {reconciliations.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <Ban className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No reconciliations yet</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reconciliations.map((rec) => (
                  <Card key={rec.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => handleSelect(rec.id)}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{rec.title}</CardTitle>
                        <Badge variant={rec.status === 'APPROVED' ? 'success' : rec.status === 'PENDING' ? 'warning' : 'default'}>
                          {rec.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rec.periodStart)} - {formatDate(rec.periodEnd)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(rec.createdAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      ) : detailLoading ? (
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1">
            <CardHeader><CardTitle>Bank Records</CardTitle></CardHeader>
            <CardContent><EntryListSkeleton /></CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader><CardTitle>Match Results</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-1">
            <CardHeader><CardTitle>Accounting Records</CardTitle></CardHeader>
            <CardContent><EntryListSkeleton /></CardContent>
          </Card>
        </div>
      ) : detailError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">Failed to load reconciliation details</p>
          <Button className="mt-4" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['reconciliation', selectedId] })}>
            Retry
          </Button>
        </div>
      ) : matchResponse ? (
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Bank Records</CardTitle>
                <Badge variant="outline">{bankEntries.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                <TabsList className="mb-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="matched">Matched</TabsTrigger>
                  <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
                  <TabsTrigger value="needsReview">Review</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab} className="mt-0">
                  {bankEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Ban className="mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No entries</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bankEntries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Match Results</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="grid grid-cols-2 gap-3">
                <StatsCard label="Bank Transactions" value={reconciliation?.totalBankTransactions ?? 0} />
                <StatsCard label="Accounting Transactions" value={reconciliation?.totalAccountingTransactions ?? 0} />
                <StatsCard label="Matched" value={reconciliation?.matchedCount ?? 0} variant="success" />
                <StatsCard label="Unmatched" value={reconciliation?.unmatchedCount ?? 0} variant="destructive" />
                <StatsCard label="Needs Review" value={reconciliation?.needsReviewCount ?? 0} variant="warning" />
                <StatsCard
                  label="Discrepancy"
                  value={formatCurrency(reconciliation?.discrepancyAmount ?? 0)}
                  variant={(reconciliation?.discrepancyAmount ?? 0) !== 0 ? 'destructive' : 'default'}
                />
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Matched</h3>
                  <div className="space-y-1">
                    {matchResponse.matched.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
                        <span className="truncate">{entry.description}</span>
                        <span className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(entry.amount)}</span>
                      </div>
                    ))}
                    {matchResponse.matched.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{matchResponse.matched.length - 5} more</p>
                    )}
                    {matchResponse.matched.length === 0 && (
                      <p className="text-xs text-muted-foreground">None</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">Unmatched</h3>
                  <div className="space-y-1">
                    {matchResponse.unmatched.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
                        <span className="truncate">{entry.description}</span>
                        <span className="tabular-nums text-red-600 dark:text-red-400">{formatCurrency(entry.amount)}</span>
                      </div>
                    ))}
                    {matchResponse.unmatched.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{matchResponse.unmatched.length - 5} more</p>
                    )}
                    {matchResponse.unmatched.length === 0 && (
                      <p className="text-xs text-muted-foreground">None</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <Button
                className="w-full"
                onClick={() => approveMutation.mutate()}
                disabled={!canApprove || approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  'Approving...'
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> Approve Reconciliation</>
                )}
              </Button>
              {needsReviewCount > 0 && (
                <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
                  {needsReviewCount} item{needsReviewCount > 1 ? 's' : ''} need{needsReviewCount === 1 ? 's' : ''} review before approval
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Accounting Records</CardTitle>
                <Badge variant="outline">{accountingEntries.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                <TabsList className="mb-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="matched">Matched</TabsTrigger>
                  <TabsTrigger value="unmatched">Unmatched</TabsTrigger>
                  <TabsTrigger value="needsReview">Review</TabsTrigger>
                </TabsList>
                <TabsContent value={activeTab} className="mt-0">
                  {accountingEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Ban className="mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">No entries</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {accountingEntries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
