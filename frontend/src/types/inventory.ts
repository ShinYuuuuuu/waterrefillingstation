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
