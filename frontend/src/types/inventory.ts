export interface InventoryItem {
  id: string
  tenantId: string
  branchId: string
  productId: string
  productName: string
  productSku: string
  quantityOnHand: number
  reservedQuantity: number
  availableQuantity: number
  reorderLevel: number
  reorderQuantity: number
  lastCountedAt: string | null
  createdAt: string
  updatedAt: string
  inCirculation: number
  soldQuantity: number
  currentBaseCount: number
  originalCount: number
}

export interface InventoryLoan {
  id: string
  product_id: string
  customer_id: string
  quantity: number
  status: 'OUTSTANDING' | 'RETURNED' | 'SOLD'
  lent_at: string
  resolved_at: string | null
  customer: { full_name: string }
  product: { name: string; sku: string }
}

export interface InventoryListResponse {
  data: InventoryItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateInventoryRequest {
  productId: string
  quantityOnHand: number
  reservedQuantity?: number
}

export interface UpdateInventoryRequest {
  quantityOnHand?: number
  reservedQuantity?: number
  lastCountedAt?: string | null
}

export interface LowStockAlert {
  productId: string
  productName: string
  branchId: string
  branchName: string
  quantityOnHand: number
  reservedQuantity: number
  availableQuantity: number
  reorderLevel: number
  reorderQuantity: number
}

export interface LedgerEntry {
  id: string
  tenantId: string
  branchId: string
  productId: string
  productName?: string
  productSku?: string
  movementType: string
  quantityDelta: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
  createdBy: string | null
}

export interface LedgerListResponse {
  data: LedgerEntry[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface StockCountSession {
  id: string
  tenantId: string
  branchId: string
  status: string
  initiatedBy: string
  approvedBy: string | null
  notes: string | null
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  items: StockCountItem[]
}

export interface StockCountItem {
  id: string
  productId: string
  productName?: string
  productSku?: string
  bookQuantity: number
  countedQuantity: number
  variance: number
  varianceAmount: number | null
  notes: string | null
  adjustmentApproved: boolean
  approvedBy: string | null
  createdAt: string
}

export interface AdjustmentRequest {
  productId: string
  quantity: number
  reason: 'DAMAGE' | 'EXPIRED' | 'LOST' | 'MANUAL' | 'OPENING_BALANCE'
  notes?: string | null
}

export interface InventoryListQuery {
  page?: number
  limit?: number
  search?: string
  lowStock?: boolean
}

export interface LedgerListQuery {
  page?: number
  limit?: number
  productId?: string
  startDate?: string
  endDate?: string
}

export interface InventoryUpdateRequest {
  id: string
  tenantId: string
  branchId: string
  productId: string
  productName?: string
  productSku?: string
  requestedBy: string
  requestedByName?: string
  approvedBy: string | null
  approvedByName?: string | null
  previousQuantity: number
  requestedQuantity: number
  approvedQuantity: number | null
  notes: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED'
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InventoryUpdateRequestListResponse {
  data: InventoryUpdateRequest[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateInventoryUpdateRequest {
  productId: string
  requestedQuantity: number
  notes?: string | null
}

export interface ReviewInventoryUpdateRequest {
  status: 'APPROVED' | 'REJECTED'
  approvedQuantity?: number | null
  notes?: string | null
}

export interface InventoryUpdateRequestListQuery {
  page?: number
  limit?: number
  status?: string
  productId?: string
  search?: string
}
