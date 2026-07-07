export interface Document {
  id: number
  filename: string
  originalFilename: string
  contentType: string
  fileSize: number
  documentType: string
  status: 'UPLOADED' | 'INDEXED' | 'ERROR'
  errorMessage?: string
  createdAt: string
  updatedAt: string
}
