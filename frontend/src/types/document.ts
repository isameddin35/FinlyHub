export interface Document {
  id: number
  filename: string
  originalFilename: string
  contentType: string
  fileSize: number
  documentType: string
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'ERROR'
  errorMessage?: string
  totalChunks: number
  indexedChunks: number
  createdAt: string
  updatedAt: string
}
