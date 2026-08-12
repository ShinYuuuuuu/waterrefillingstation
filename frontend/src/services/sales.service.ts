import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type {
  Sale,
  SaleListQuery,
  CreateSaleRequest,
  SaleListResponse,
  DailySummaryResponse,
} from '@/types/sales'

interface ApiMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: ApiMeta
}

const BASE = API_ENDPOINTS.SALES

export const salesService = {
  async list(query?: SaleListQuery): Promise<SaleListResponse> {
    const response = await apiClient.get<ApiResponse<Sale[]>>(BASE, {
      params: query,
    })
    const data = response.data.data
    const meta = response.data.meta ?? {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      total: data.length,
      totalPages: 1,
    }
    return { data, meta }
  },

  async get(id: string): Promise<Sale> {
    const response = await apiClient.get<ApiResponse<Sale>>(`${BASE}/${id}`)
    return response.data.data
  },

  async create(payload: CreateSaleRequest): Promise<Sale> {
    const response = await apiClient.post<ApiResponse<Sale>>(BASE, payload)
    return response.data.data
  },

  async dailySummary(date?: string): Promise<DailySummaryResponse> {
    const response = await apiClient.get<ApiResponse<DailySummaryResponse>>(`${BASE}/daily-summary`, {
      params: date ? { date } : undefined,
    })
    return response.data.data
  },

  async incomeTrends(): Promise<{ daily: { label: string; total: number; transactions: number }[]; weekly: { label: string; total: number; transactions: number }[]; monthly: { label: string; total: number; transactions: number }[] }> {
    const response = await apiClient.get<ApiResponse<any>>(`${BASE}/income-trends`)
    return response.data.data
  },
}
