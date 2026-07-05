export interface ReconciliationUploadResponse {
  id: number
  title: string
  status: string
  totalBank: number
  totalAccounting: number
}

export interface ReconciliationResponse {
  id: number
  title: string
  status: string
  totalBankTransactions: number
  totalAccountingTransactions: number
  matchedCount: number
  unmatchedCount: number
  needsReviewCount: number
  discrepancyAmount: number
  periodStart: string
  periodEnd: string
  createdAt: string
}

export interface ReconciliationEntryResponse {
  id: number
  source: string
  transactionDate: string
  description: string
  amount: number
  reference: string | null
  matchedEntryId: number | null
  matchStatus: string
  matchScore: number | null
  amountDifference: number | null
  dateDifferenceDays: number | null
}

export interface ReconciliationMatchResponse {
  reconciliation: ReconciliationResponse
  matched: ReconciliationEntryResponse[]
  unmatched: ReconciliationEntryResponse[]
  needsReview: ReconciliationEntryResponse[]
}
