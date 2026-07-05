export interface TransactionResponse {
  id: number
  transactionDate: string
  description: string
  amount: number
  currency: string
  reference: string | null
  vendor: string | null
  source: string
  categoryName: string | null
  suggestedCategoryName: string | null
  confidenceScore: number | null
  categorizationStatus: string
  userApproved: boolean | null
  importBatchId: string | null
  createdAt: string
}

export interface TransactionCategoryResponse {
  id: number
  name: string
  description: string
  icon: string
  color: string
}

export interface TransactionUploadResponse {
  batchId: string
  totalCount: number
  message: string
}

export interface TransactionImportResponse {
  totalImported: number
  categorized: number
  failed: number
}

export interface TransactionCategorizeRequest {
  categoryId: number
}
