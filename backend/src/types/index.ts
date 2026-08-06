export type PaginationQuery = {
  page?: number
  limit?: number
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
