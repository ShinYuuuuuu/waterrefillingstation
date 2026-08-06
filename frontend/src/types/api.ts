export interface ApiResponse<T = unknown> {
  data: T
  message: string
  success: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
