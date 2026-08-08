import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type {
  Product,
  ProductListQuery,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/types/product'

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

const BASE = API_ENDPOINTS.PRODUCTS

export const productService = {
  async list(query?: ProductListQuery): Promise<{ data: Product[]; meta: ApiMeta }> {
    const response = await apiClient.get<ApiResponse<Product[]>>(BASE, {
      params: query,
    })
    return {
      data: response.data.data,
      meta: response.data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  },

  async get(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`${BASE}/${id}`)
    return response.data.data
  },

  async create(payload: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>(BASE, payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateProductRequest): Promise<Product> {
    const response = await apiClient.put<ApiResponse<Product>>(`${BASE}/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`)
  },

  async archive(id: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>(`${BASE}/${id}/archive`)
    return response.data.data
  },

  async reactivate(id: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>(`${BASE}/${id}/reactivate`)
    return response.data.data
  },

  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string }> {
    const response = await apiClient.get<ApiResponse<{ canDelete: boolean; reason?: string }>>(`${BASE}/${id}/can-delete`)
    return response.data.data
  },
}
