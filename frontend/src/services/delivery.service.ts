import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type {
  DeliveryOrder,
  DeliveryOrderListQuery,
  CreateDeliveryOrderRequest,
  UpdateDeliveryOrderRequest,
  UpdateDeliveryOrderStatusRequest,
  AssignRiderRequest,
  DeliveryOrderListResponse,
  RiderOption,
} from '@/types/delivery'

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

const BASE = API_ENDPOINTS.DELIVERIES

export const deliveryService = {
  async list(query?: DeliveryOrderListQuery): Promise<DeliveryOrderListResponse> {
    const response = await apiClient.get<ApiResponse<any[]>>(BASE, {
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

  async get(id: string): Promise<DeliveryOrder> {
    const response = await apiClient.get<ApiResponse<any>>(`${BASE}/${id}`)
    return response.data.data
  },

  async create(payload: CreateDeliveryOrderRequest): Promise<DeliveryOrder> {
    const response = await apiClient.post<ApiResponse<any>>(BASE, payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateDeliveryOrderRequest): Promise<DeliveryOrder> {
    const response = await apiClient.put<ApiResponse<any>>(`${BASE}/${id}`, payload)
    return response.data.data
  },

  async updateStatus(id: string, payload: UpdateDeliveryOrderStatusRequest): Promise<DeliveryOrder> {
    const response = await apiClient.patch<ApiResponse<any>>(`${BASE}/${id}/status`, payload)
    return response.data.data
  },

  async assignRider(id: string, payload: AssignRiderRequest): Promise<DeliveryOrder> {
    const response = await apiClient.post<ApiResponse<any>>(`${BASE}/${id}/assign`, payload)
    return response.data.data
  },

  async getRiders(query?: { search?: string; isActive?: boolean }): Promise<RiderOption[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`${BASE}/riders`, {
      params: query,
    })
    return response.data.data
  },
}
