import { ApiResponse } from '../types'

export function successResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  }
}

export function errorResponse(code: string, message: string, details?: unknown): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  }
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}