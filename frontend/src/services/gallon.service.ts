import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type {
  GallonItem,
  GallonListResponse,
  GallonListQuery,
  CreateGallonRequest,
  UpdateGallonRequest,
} from '@/types/gallon'

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

function toGallonItem(raw: any): GallonItem {
  return {
    id: raw.id,
    tenantId: raw.tenantId ?? raw.tenant_id,
    branchId: raw.branchId ?? raw.branch_id,
    gallonTypeId: raw.gallonTypeId ?? raw.gallon_type_id,
    tagCode: raw.tagCode ?? raw.tag_code,
    serialNumber: raw.serialNumber ?? raw.serial_number ?? null,
    status: raw.status,
    currentHolderType: raw.currentHolderType ?? raw.current_holder_type ?? null,
    currentHolderId: raw.currentHolderId ?? raw.current_holder_id ?? null,
    currentCondition: raw.currentCondition ?? raw.current_condition ?? null,
    purchaseDate: raw.purchaseDate ?? raw.purchase_date ?? null,
    purchasePrice: raw.purchasePrice ?? raw.purchase_price ?? null,
    lastCleanedAt: raw.lastCleanedAt ?? raw.last_cleaned_at ?? null,
    lastInspectedAt: raw.lastInspectedAt ?? raw.last_inspected_at ?? null,
    lastFilledAt: raw.lastFilledAt ?? raw.last_filled_at ?? null,
    totalFillCount: raw.totalFillCount ?? raw.total_fill_count ?? 0,
    totalCleanings: raw.totalCleanings ?? raw.total_cleanings ?? 0,
    isActive: raw.isActive ?? raw.is_active ?? true,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  }
}

export const gallonService = {
  async listGallons(query?: GallonListQuery): Promise<GallonListResponse> {
    const params: Record<string, unknown> = {}
    if (query?.page) params.page = query.page
    if (query?.limit) params.limit = query.limit
    if (query?.status) params.status = query.status
    if (query?.search) params.search = query.search

    const response = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.GALLONS, { params })
    const items = (response.data.data ?? []).map(toGallonItem)
    const meta = response.data.meta ?? {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      total: items.length,
      totalPages: 1,
    }
    return { data: items, meta }
  },

  async getGallon(id: string): Promise<GallonItem> {
    const response = await apiClient.get<ApiResponse<any>>(`${API_ENDPOINTS.GALLONS}/${id}`)
    return toGallonItem(response.data.data)
  },

  async createGallon(payload: CreateGallonRequest): Promise<GallonItem> {
    const response = await apiClient.post<ApiResponse<any>>(API_ENDPOINTS.GALLONS, payload)
    return toGallonItem(response.data.data)
  },

  async updateGallon(id: string, payload: UpdateGallonRequest): Promise<GallonItem> {
    const response = await apiClient.put<ApiResponse<any>>(`${API_ENDPOINTS.GALLONS}/${id}`, payload)
    return toGallonItem(response.data.data)
  },

  async updateGallonStatus(id: string, status: string, notes?: string | null): Promise<GallonItem> {
    const response = await apiClient.patch<ApiResponse<any>>(`${API_ENDPOINTS.GALLONS}/${id}/status`, {
      status,
      notes: notes ?? null,
    })
    return toGallonItem(response.data.data)
  },

  async deleteGallon(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.GALLONS}/${id}`)
  },
}
