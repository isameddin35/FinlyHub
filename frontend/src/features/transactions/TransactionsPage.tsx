import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionApi } from '@/api/transactions'
import type { TransactionResponse, TransactionCategoryResponse } from '@/types/transaction'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, CheckCircle, AlertCircle, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'

export function TransactionsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [selectedCategories, setSelectedCategories] = useState<Record<number, string>>({})
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionApi.list().then(res => res.data.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => transactionApi.getCategories().then(res => res.data.data),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => transactionApi.import(file),
    onSuccess: (res) => {
      toast.success(`Import successful! Batch: ${res.data.data.batchId}`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => {
      toast.error('Failed to import transactions')
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number }) =>
      transactionApi.approve(id, { categoryId }),
    onSuccess: () => {
      toast.success('Transaction approved')
      setApprovingId(null)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => {
      toast.error('Failed to approve transaction')
      setApprovingId(null)
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) uploadMutation.mutate(file)
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    noClick: true,
    noKeyboard: true,
  })

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    switch (filter) {
      case 'pending':
        return transactions.filter(t => !t.userApproved)
      case 'approved':
        return transactions.filter(t => t.userApproved === true)
      default:
        return transactions
    }
  }, [transactions, filter])

  const stats = useMemo(() => ({
    total: transactions?.length ?? 0,
    pending: transactions?.filter(t => !t.userApproved).length ?? 0,
    approved: transactions?.filter(t => t.userApproved === true).length ?? 0,
  }), [transactions])

  const handleApprove = (transaction: TransactionResponse) => {
    const categoryIdStr = selectedCategories[transaction.id]
    const hasCategoryOverride = categoryIdStr !== undefined && categoryIdStr !== ''

    if (hasCategoryOverride) {
      setApprovingId(transaction.id)
      approveMutation.mutate({ id: transaction.id, categoryId: parseInt(categoryIdStr) })
      return
    }

    if (transaction.suggestedCategoryName && categories) {
      const suggested = categories.find(c => c.name === transaction.suggestedCategoryName)
      if (suggested) {
        setApprovingId(transaction.id)
        approveMutation.mutate({ id: transaction.id, categoryId: suggested.id })
        return
      }
    }

    toast.error('Please select a category')
  }

  const getConfidenceVariant = (score: number): 'success' | 'warning' | 'destructive' => {
    if (score >= 80) return 'success'
    if (score >= 50) return 'warning'
    return 'destructive'
  }

  const getConfidenceColor = (score: number): string => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h3 className="text-lg font-semibold">Failed to load transactions</h3>
        <p className="mt-2 text-sm text-muted-foreground">Please try again later.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold">Transactions</h2>
            <p className="text-sm text-muted-foreground">
              Upload and manage your financial transactions
            </p>
          </div>
          <Button onClick={open} disabled={uploadMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? 'Uploading...' : 'Import CSV/XLSX'}
          </Button>
        </div>
        {isDragActive && (
          <p className="mt-4 text-center text-sm font-medium text-primary">
            Drop your file here
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(['all', 'pending', 'approved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No transactions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {filter === 'pending'
                  ? 'All transactions have been reviewed.'
                  : filter === 'approved'
                  ? 'No approved transactions found.'
                  : 'Import a CSV or XLSX file to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id}
                      className={`border-b text-sm transition-colors hover:bg-muted/50 ${
                        index % 2 === 1 ? 'bg-muted/20' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(transaction.transactionDate)}
                      </td>
                      <td className="max-w-[250px] truncate px-4 py-3">
                        {transaction.description}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 font-medium ${
                          transaction.amount < 0
                            ? 'text-red-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {transaction.amount < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingUp className="h-3.5 w-3.5" />
                          )}
                          {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {transaction.userApproved ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {transaction.categoryName}
                          </Badge>
                        ) : (
                          <Badge
                            variant={
                              transaction.confidenceScore !== null
                                ? getConfidenceVariant(transaction.confidenceScore)
                                : 'secondary'
                            }
                          >
                            {transaction.suggestedCategoryName || 'Uncategorized'}
                          </Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {!transaction.userApproved && transaction.confidenceScore !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${getConfidenceColor(transaction.confidenceScore)}`}
                                style={{ width: `${transaction.confidenceScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatPercentage(transaction.confidenceScore)}
                            </span>
                          </div>
                        ) : transaction.userApproved ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {!transaction.userApproved ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedCategories[transaction.id] ?? ''}
                              onValueChange={(value) =>
                                setSelectedCategories((prev) => ({
                                  ...prev,
                                  [transaction.id]: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue placeholder="Category..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApprove(transaction)}
                              disabled={approvingId === transaction.id}
                            >
                              {approvingId === transaction.id ? (
                                'Approving...'
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-200 text-emerald-600"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approved
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
