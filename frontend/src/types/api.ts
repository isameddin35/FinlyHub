export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
  size: number
  number: number
}
