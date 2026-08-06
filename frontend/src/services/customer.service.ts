import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type {
  Customer,
  CustomerListQuery,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/types/customer'

/**
 * Service for the Customer Management module.
 *
 * Thin wrapper over the shared `apiClient` (which handles auth token
 * injection, 401 refresh, and error normalization). Each method returns the
 * unwrapped business payload; transport concerns (HTTP status, response
 * envelope) are handled here.
 *
 * API: /api/v1/customers (see backend/src/modules/customer/customer.routes.ts)
 */
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

const BASE = API_ENDPOINTS.CUSTOMERS

export const customerService = {
  /** GET /customers — paginated, searchable list. */
  async list(query?: CustomerListQuery): Promise<{ data: Customer[]; meta: ApiMeta }> {
    const response = await apiClient.get<ApiResponse<Customer[]>>(BASE, {
      params: query,
    })
    return {
      data: response.data.data,
      meta: response.data.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  },

  /** GET /customers/:id — single customer. */
  async get(id: string): Promise<Customer> {
    const response = await apiClient.get<ApiResponse<Customer>>(`${BASE}/${id}`)
    return response.data.data
  },

  /** POST /customers — create a new customer. */
  async create(payload: CreateCustomerRequest): Promise<Customer> {
    const response = await apiClient.post<ApiResponse<Customer>>(BASE, payload)
    return response.data.data
  },

  /** PUT /customers/:id — update an existing customer. */
  async update(id: string, payload: UpdateCustomerRequest): Promise<Customer> {
    const response = await apiClient.put<ApiResponse<Customer>>(`${BASE}/${id}`, payload)
    return response.data.data
  },

  /** DELETE /customers/:id — soft-delete a customer. */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`)
  },
}
