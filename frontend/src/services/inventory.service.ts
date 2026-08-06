import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type {
  InventoryItem,
  InventoryListResponse,
  LowStockAlert,
  LedgerEntry,
  LedgerListResponse,
  StockCountSession,
  AdjustmentRequest,
  InventoryListQuery,
  LedgerListQuery,
} from '@/types/inventory'

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

function toInventoryItem(raw: any, productName: string, productSku: string): InventoryItem {
  const quantityOnHand = Number(raw.quantity_on_hand ?? raw.quantityOnHand ?? 0)
  const reservedQuantity = Number(raw.reserved_quantity ?? raw.reservedQuantity ?? 0)
  const reorderLevel = Number(raw.product?.reorder_level ?? raw.reorderLevel ?? 0)
  return {
    id: raw.id,
    tenantId: raw.tenant_id ?? raw.tenantId,
    branchId: raw.branch_id ?? raw.branchId,
    productId: raw.product_id ?? raw.productId,
    productName: productName ?? raw.productName,
    productSku: productSku ?? raw.productSku,
    quantityOnHand,
    reservedQuantity,
    availableQuantity: quantityOnHand - reservedQuantity,
    reorderLevel,
    reorderQuantity: raw.reorder_quantity ?? raw.reorderQuantity ?? 1,
    lastCountedAt: raw.last_counted_at ?? raw.lastCountedAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

function toLedgerEntry(raw: any): LedgerEntry {
  return {
    id: raw.id,
    tenantId: raw.tenant_id ?? raw.tenantId,
    branchId: raw.branch_id ?? raw.branchId,
    productId: raw.product_id ?? raw.productId,
    productName: raw.product?.name ?? raw.productName,
    productSku: raw.product?.sku ?? raw.productSku,
    movementType: raw.movement_type ?? raw.movementType,
    quantityDelta: Number(raw.quantity_delta ?? raw.quantityDelta ?? 0),
    referenceType: raw.reference_type ?? raw.referenceType ?? null,
    referenceId: raw.reference_id ?? raw.referenceId ?? null,
    notes: raw.notes ?? raw.notes ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
    createdBy: raw.created_by ?? raw.createdBy ?? null,
  }
}

export const inventoryService = {
  async listBranchInventory(query?: InventoryListQuery): Promise<InventoryListResponse> {
    const params: Record<string, unknown> = {}
    if (query?.page) params.page = query.page
    if (query?.limit) params.limit = query.limit
    if (query?.search) params.search = query.search
    if (query?.lowStock !== undefined) params.lowStock = query.lowStock

    const response = await apiClient.get<ApiResponse<any[]>>(`${API_ENDPOINTS.INVENTORY}/branch`, { params })
    const items = (response.data.data ?? []).map((raw: any) =>
      toInventoryItem(raw, raw.product?.name, raw.product?.sku),
    )
    const meta = response.data.meta ?? {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      total: items.length,
      totalPages: 1,
    }
    return { data: items, meta }
  },

  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`${API_ENDPOINTS.INVENTORY}/alerts/low-stock`)
    return (response.data.data ?? []).map((raw: any) => ({
      productId: raw.product_id ?? raw.productId,
      productName: raw.product_name ?? raw.productName,
      branchId: raw.branch_id ?? raw.branchId,
      branchName: raw.branch_name ?? raw.branchName,
      quantityOnHand: Number(raw.quantity_on_hand ?? raw.quantityOnHand ?? 0),
      reservedQuantity: Number(raw.reserved_quantity ?? raw.reservedQuantity ?? 0),
      availableQuantity: Number(raw.available_quantity ?? raw.availableQuantity ?? 0),
      reorderLevel: Number(raw.reorder_level ?? raw.reorderLevel ?? 0),
      reorderQuantity: Number(raw.reorder_quantity ?? raw.reorderQuantity ?? 1),
    }))
  },

  async createAdjustment(payload: AdjustmentRequest): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`${API_ENDPOINTS.INVENTORY}/adjustments`, payload)
    return response.data.data
  },

  async listLedgerEntries(query?: LedgerListQuery): Promise<LedgerListResponse> {
    const params: Record<string, unknown> = {}
    if (query?.page) params.page = query.page
    if (query?.limit) params.limit = query.limit
    if (query?.productId) params.productId = query.productId
    if (query?.startDate) params.startDate = query.startDate
    if (query?.endDate) params.endDate = query.endDate

    const response = await apiClient.get<ApiResponse<any[]>>(`${API_ENDPOINTS.INVENTORY}/ledger`, { params })
    const items = (response.data.data ?? []).map(toLedgerEntry)
    const meta = response.data.meta ?? {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      total: items.length,
      totalPages: 1,
    }
    return { data: items, meta }
  },

  async createStockCountSession(notes?: string | null): Promise<StockCountSession> {
    const response = await apiClient.post<ApiResponse<any>>(`${API_ENDPOINTS.INVENTORY}/stock-counts`, { notes })
    const raw = response.data.data
    return {
      id: raw.id,
      tenantId: raw.tenant_id ?? raw.tenantId,
      branchId: raw.branch_id ?? raw.branchId,
      status: raw.status,
      initiatedBy: raw.initiated_by ?? raw.initiatedBy,
      approvedBy: raw.approved_by ?? raw.approvedBy,
      notes: raw.notes ?? raw.notes ?? null,
      createdAt: raw.created_at ?? raw.createdAt,
      submittedAt: raw.submitted_at ?? raw.submittedAt ?? null,
      approvedAt: raw.approved_at ?? raw.approvedAt ?? null,
      items: (raw.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.product_id ?? item.productId,
        productName: item.productName,
        productSku: item.productSku,
        bookQuantity: Number(item.book_quantity ?? item.bookQuantity ?? 0),
        countedQuantity: Number(item.counted_quantity ?? item.countedQuantity ?? 0),
        variance: Number(item.variance ?? 0),
        varianceAmount: item.variance_amount ?? item.varianceAmount ?? null,
        notes: item.notes ?? item.notes ?? null,
        adjustmentApproved: item.adjustment_approved ?? item.adjustmentApproved ?? false,
        approvedBy: item.approved_by ?? item.approvedBy ?? null,
        createdAt: item.created_at ?? item.createdAt,
      })),
    }
  },

  async getStockCountSession(sessionId: string): Promise<StockCountSession> {
    const response = await apiClient.get<ApiResponse<any>>(`${API_ENDPOINTS.INVENTORY}/stock-counts/${sessionId}`)
    const raw = response.data.data
    return {
      id: raw.id,
      tenantId: raw.tenant_id ?? raw.tenantId,
      branchId: raw.branch_id ?? raw.branchId,
      status: raw.status,
      initiatedBy: raw.initiated_by ?? raw.initiatedBy,
      approvedBy: raw.approved_by ?? raw.approvedBy,
      notes: raw.notes ?? raw.notes ?? null,
      createdAt: raw.created_at ?? raw.createdAt,
      submittedAt: raw.submitted_at ?? raw.submittedAt ?? null,
      approvedAt: raw.approved_at ?? raw.approvedAt ?? null,
      items: (raw.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.product_id ?? item.productId,
        productName: item.productName,
        productSku: item.productSku,
        bookQuantity: Number(item.book_quantity ?? item.bookQuantity ?? 0),
        countedQuantity: Number(item.counted_quantity ?? item.countedQuantity ?? 0),
        variance: Number(item.variance ?? 0),
        varianceAmount: item.variance_amount ?? item.varianceAmount ?? null,
        notes: item.notes ?? item.notes ?? null,
        adjustmentApproved: item.adjustment_approved ?? item.adjustmentApproved ?? false,
        approvedBy: item.approved_by ?? item.approvedBy ?? null,
        createdAt: item.created_at ?? item.createdAt,
      })),
    }
  },

  async approveStockCount(sessionId: string): Promise<StockCountSession> {
    const response = await apiClient.post<ApiResponse<any>>(`${API_ENDPOINTS.INVENTORY}/stock-counts/${sessionId}/approve`)
    const raw = response.data.data
    return {
      id: raw.id,
      tenantId: raw.tenant_id ?? raw.tenantId,
      branchId: raw.branch_id ?? raw.branchId,
      status: raw.status,
      initiatedBy: raw.initiated_by ?? raw.initiatedBy,
      approvedBy: raw.approved_by ?? raw.approvedBy,
      notes: raw.notes ?? raw.notes ?? null,
      createdAt: raw.created_at ?? raw.createdAt,
      submittedAt: raw.submitted_at ?? raw.submittedAt ?? null,
      approvedAt: raw.approved_at ?? raw.approvedAt ?? null,
      items: (raw.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.product_id ?? item.productId,
        productName: item.productName,
        productSku: item.productSku,
        bookQuantity: Number(item.book_quantity ?? item.bookQuantity ?? 0),
        countedQuantity: Number(item.counted_quantity ?? item.countedQuantity ?? 0),
        variance: Number(item.variance ?? 0),
        varianceAmount: item.variance_amount ?? item.varianceAmount ?? null,
        notes: item.notes ?? item.notes ?? null,
        adjustmentApproved: item.adjustment_approved ?? item.adjustmentApproved ?? false,
        approvedBy: item.approved_by ?? item.approvedBy ?? null,
        createdAt: item.created_at ?? item.createdAt,
      })),
    }
  },
}
