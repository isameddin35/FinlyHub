import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, File as FileIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'
import { useState } from 'react'
import apiClient from '@/api/client'
import type { ApiResponse } from '@/types/api'

interface Document {
  id: number
  filename: string
  documentType: string
  status: 'UPLOADED' | 'INDEXED' | 'ERROR'
  createdAt: string
}

const documentApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<ApiResponse<Document>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => apiClient.get<ApiResponse<Document[]>>('/documents'),
  delete: (id: number) => apiClient.delete<ApiResponse<void>>(`/documents/${id}`),
}

const statusConfig: Record<Document['status'], { label: string; variant: 'secondary' | 'success' | 'destructive'; icon: typeof CheckCircle }> = {
  UPLOADED: { label: 'Uploaded', variant: 'secondary', icon: FileIcon },
  INDEXED: { label: 'Indexed', variant: 'success', icon: CheckCircle },
  ERROR: { label: 'Error', variant: 'destructive', icon: AlertCircle },
}

function DocumentSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Skeleton className="h-10 w-10 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  )
}

export function DocumentsPage() {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const { data: documentsData, isLoading, isError, error } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data } = await documentApi.list()
      return data.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: uploading,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      try {
        await documentApi.upload(file)
        queryClient.invalidateQueries({ queryKey: ['documents'] })
        toast.success(`${file.name} uploaded successfully`)
      } catch {
        toast.error('Failed to upload document')
      } finally {
        setUploading(false)
      }
    },
  })

  const documents = documentsData ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">Upload and manage your financial documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            {uploading ? (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            ) : isDragActive ? (
              <p className="text-sm text-muted-foreground">Drop your file here</p>
            ) : (
              <>
                <p className="text-sm font-medium">Drag & drop or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, or TXT files</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            All Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <DocumentSkeleton />
              <DocumentSkeleton />
              <DocumentSkeleton />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">Failed to load documents</p>
              <p className="text-xs text-muted-foreground">{(error as Error)?.message ?? 'An unexpected error occurred'}</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}>
                Retry
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
              <p className="text-xs text-muted-foreground">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const status = statusConfig[doc.status]
                const StatusIcon = status.icon

                return (
                  <div key={doc.id} className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.filename}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="uppercase">{doc.documentType}</span>
                        <span>&middot;</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
