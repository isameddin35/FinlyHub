import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceApi } from '@/api/invoices'
import apiClient from '@/api/client'
import type { InvoiceResponse } from '@/types/invoice'
import type { ApiResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils'
import toast from 'react-hot-toast'

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, 'warning' | 'secondary' | 'success' | 'default'> = {
    PENDING: 'warning',
    PROCESSING: 'secondary',
    APPROVED: 'success',
  }
  const labelMap: Record<string, string> = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    APPROVED: 'Approved',
  }
  return <Badge variant={variantMap[status] ?? 'default'}>{labelMap[status] ?? status}</Badge>
}

function ConfidenceField({ label, value, confidence }: { label: string; value: string | number | null; confidence: number | null }) {
  const score = confidence ?? 0
  const color = score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className={`text-xs font-medium ${color}`}>{formatPercentage(score)}</span>
      </div>
      <Input value={value ?? ''} readOnly className="bg-muted/50" />
    </div>
  )
}

function InvoiceSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-2 w-full mt-2" />
      </CardContent>
    </Card>
  )
}

function InvoiceCard({ invoice, onClick }: { invoice: InvoiceResponse; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{invoice.vendorName ?? 'Unknown Vendor'}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.invoiceNumber ?? 'No invoice number'}
            </p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '—'}</span>
          <span className="font-semibold">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span>{invoice.confidenceScore != null ? formatPercentage(invoice.confidenceScore) : '—'}</span>
          </div>
          <Progress value={invoice.confidenceScore ?? 0} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function InvoicesPage() {
  const queryClient = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: invoices, isLoading, isError } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await invoiceApi.list()
      return response.data.data.content
    },
    refetchInterval: (query) =>
      query.state.data?.some(inv => inv.status === 'PROCESSING') ? 3000 : false,
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<ApiResponse<{ id: number; filename: string; status: string; message: string }>>(
        '/invoices/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
              setUploadProgress(progress)
            }
          },
        }
      )

      if (response.data.success) {
        toast.success('Invoice uploaded — processing in background')
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
      } else {
        toast.error(response.data.message || 'Failed to upload invoice')
      }
    } catch {
      toast.error('Failed to upload invoice')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [queryClient])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  const approveMutation = useMutation({
    mutationFn: async (invoice: InvoiceResponse) => {
      const response = await invoiceApi.approve(invoice.id, {
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        vendorName: invoice.vendorName ?? undefined,
        vendorEmail: invoice.vendorEmail ?? undefined,
        invoiceDate: invoice.invoiceDate ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
        currency: invoice.currency,
        subtotal: invoice.subtotal ?? undefined,
        taxAmount: invoice.taxAmount ?? undefined,
        vatAmount: invoice.vatAmount ?? undefined,
        discountAmount: invoice.discountAmount ?? undefined,
        totalAmount: invoice.totalAmount,
      })
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Invoice approved successfully')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setDialogOpen(false)
      setSelectedInvoice(null)
    },
    onError: () => {
      toast.error('Failed to approve invoice')
    },
  })

  const openDialog = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice)
    setDialogOpen(true)
  }

  const invoice = selectedInvoice

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage your invoices
          </p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground mb-2">Uploading invoice...</p>
            <Progress value={uploadProgress} className="h-2 w-full max-w-xs" />
            <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
          </>
        ) : (
          <>
            {isDragActive ? (
              <>
                <Upload className="mb-2 h-8 w-8 text-primary" />
                <p className="text-sm font-medium text-primary">Drop your invoice here</p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  PDF, PNG, or JPG — up to 10MB
                </p>
              </>
            )}
          </>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Processed Invoices</h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <InvoiceSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-destructive">Failed to load invoices</p>
            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
          </div>
        ) : invoices && invoices.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} onClick={() => openDialog(invoice)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Upload an invoice above to get started
            </p>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedInvoice(null) }}>
        {invoice && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="truncate">
                    Invoice {invoice.invoiceNumber ?? '(no number)'}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {invoice.vendorName ?? 'Unknown vendor'}
                  </DialogDescription>
                </div>
                <StatusBadge status={invoice.status} />
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {invoice.confidenceScore != null && (
                <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall Confidence</span>
                    <span className={invoice.confidenceScore >= 80 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : invoice.confidenceScore >= 50 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                      {formatPercentage(invoice.confidenceScore)}
                    </span>
                  </div>
                  <Progress value={invoice.confidenceScore} className="h-2" />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <ConfidenceField label="Vendor Name" value={invoice.vendorName} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Vendor Email" value={invoice.vendorEmail} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Invoice Date" value={invoice.invoiceDate ? formatDate(invoice.invoiceDate) : null} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Due Date" value={invoice.dueDate ? formatDate(invoice.dueDate) : null} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Currency" value={invoice.currency} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Subtotal" value={invoice.subtotal != null ? formatCurrency(invoice.subtotal, invoice.currency) : null} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Tax Amount" value={invoice.taxAmount != null ? formatCurrency(invoice.taxAmount, invoice.currency) : null} confidence={invoice.confidenceScore} />
                <ConfidenceField label="VAT Amount" value={invoice.vatAmount != null ? formatCurrency(invoice.vatAmount, invoice.currency) : null} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Discount" value={invoice.discountAmount != null ? formatCurrency(invoice.discountAmount, invoice.currency) : null} confidence={invoice.confidenceScore} />
                <ConfidenceField label="Total Amount" value={formatCurrency(invoice.totalAmount, invoice.currency)} confidence={invoice.confidenceScore} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedInvoice(null) }}>
                Close
              </Button>
              {invoice.status !== 'APPROVED' && (
                <Button
                  onClick={() => approveMutation.mutate(invoice)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
