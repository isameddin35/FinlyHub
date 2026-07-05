export interface InvoiceResponse {
  id: number
  invoiceNumber: string | null
  vendorName: string | null
  vendorEmail: string | null
  invoiceDate: string | null
  dueDate: string | null
  currency: string
  subtotal: number | null
  taxAmount: number | null
  vatAmount: number | null
  discountAmount: number | null
  totalAmount: number
  status: string
  confidenceScore: number | null
  createdAt: string
}

export interface InvoiceUploadResponse {
  id: number
  filename: string
  status: string
  message: string
}

export interface InvoiceApprovalRequest {
  invoiceNumber?: string
  vendorName?: string
  vendorEmail?: string
  vendorAddress?: string
  invoiceDate?: string
  dueDate?: string
  currency?: string
  subtotal?: number
  taxAmount?: number
  vatAmount?: number
  discountAmount?: number
  totalAmount?: number
}
