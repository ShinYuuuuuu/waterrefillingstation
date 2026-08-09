/**
 * Type definitions for the Inventory Management module.
 *
 * The interfaces mirror the database models in backend/prisma/schema.prisma
 * (snake_case DB columns). API-facing types use camelCase per the project
 * naming conventions (AI_PROJECT_RULES.md §2.4).
 */

// --- Enums ---------------------------------------------------------------

/** Mirrors the MovementType enum in schema.prisma. */
export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'PRODUCTION'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT'
  | 'WRITE_OFF'
  | 'RETURN'
  | 'CLEANING'
  | 'FILLING'
  | 'INSPECTION'

/** Mirrors the StockTransferStatus enum in schema.prisma. */
export type StockTransferStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'DISCREPANCY'
  | 'CANCELLED'

/** Matches the workflow specified in the task brief. */
export type StockCountStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

/** Status for cashier inventory update requests. */
export type InventoryUpdateRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED'

/** Reasons for an inventory adjustment. */
export type AdjustmentReason =
  | 'DAMAGE'
  | 'EXPIRED'
  | 'LOST'
  | 'MANUAL'
  | 'OPENING_BALANCE'

/** Batch production status. */
export type ProductionBatchStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

/** Movement types that carry a signed quantity delta. */
export const MOVEMENT_TYPE_DELTAS: Record<MovementType, number> = {
  SALE: -1,
  PURCHASE: 1,
  PRODUCTION: 1,
  TRANSFER_IN: 1,
  TRANSFER_OUT: -1,
  ADJUSTMENT: 0, // sign determined by reason
  WRITE_OFF: -1,
  RETURN: 1,
  CLEANING: 0,
  FILLING: 0,
  INSPECTION: 0,
}

/**
 * Valid status transitions for a stock transfer.
 * Key = current status, Value = set of allowed next statuses.
 */
export const STOCK_TRANSFER_TRANSITIONS: Record<StockTransferStatus, StockTransferStatus[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['RECEIVED', 'DISCREPANCY', 'CANCELLED'],
  RECEIVED: [],
  DISCREPANCY: ['CANCELLED'],
  CANCELLED: [],
}

// --- Database entities (snake_case) --------------------------------------

export interface BranchInventory {
  id: string
  tenant_id: string
  branch_id: string
  product_id: string
  quantity_on_hand: number
  reserved_quantity: number
  last_counted_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface InventoryLedger {
  id: string
  tenant_id: string
  branch_id: string
  product_id: string
  movement_type: MovementType
  quantity_delta: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_at: Date
  deleted_at: Date | null
  created_by: string | null
}

export interface ProductionBatch {
  id: string
  tenant_id: string
  branch_id: string
  batch_number: string
  raw_input_liters: number | null
  output_product_id: string
  output_quantity: number
  operator_id: string
  quality_check_passed: boolean
  quality_notes: string | null
  started_at: Date
  completed_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface StockTransfer {
  id: string
  tenant_id: string
  origin_branch_id: string
  destination_branch_id: string
  status: StockTransferStatus
  requested_by: string
  approved_by: string | null
  notes: string | null
  shipped_at: Date | null
  received_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface StockTransferItem {
  id: string
  stock_transfer_id: string
  product_id: string
  container_id: string | null
  quantity_sent: number
  quantity_received: number | null
  notes: string | null
}

export interface StockCountSession {
  id: string
  tenant_id: string
  branch_id: string
  status: StockCountStatus
  initiated_by: string
  approved_by: string | null
  notes: string | null
  created_at: Date
  submitted_at: Date | null
  approved_at: Date | null
  deleted_at: Date | null
}

export interface StockCountItem {
  id: string
  session_id: string
  product_id: string
  book_quantity: number
  counted_quantity: number
  variance: number
  variance_amount: number | null
  notes: string | null
  adjustment_approved: boolean
  approved_by: string | null
  created_at: Date
  deleted_at: Date | null
}

// --- API request bodies (camelCase) --------------------------------------

export interface CreateBranchInventoryRequest {
  productId: string
  branchId?: string // optional; defaults to ctx.branchId or requires HQ branch selection
  quantityOnHand?: number
  reservedQuantity?: number
}

export interface UpdateBranchInventoryRequest {
  quantityOnHand?: number
  reservedQuantity?: number
  lastCountedAt?: string | null
}

export interface CreateProductionBatchRequest {
  batchNumber: string
  outputProductId: string
  outputQuantity: number
  rawInputLiters?: number | string | null
  qualityCheckPassed?: boolean
  qualityNotes?: string | null
}

export interface StockTransferItemInput {
  productId: string
  quantity: number
  containerId?: string | null
  notes?: string | null
}

export interface CreateStockTransferRequest {
  destinationBranchId: string
  items: StockTransferItemInput[]
  notes?: string | null
}

export interface CreateStockCountRequest {
  notes?: string | null
  items: { productId: string; countedQuantity: number; notes?: string | null }[]
}

export interface CreateInventoryAdjustmentRequest {
  productId: string
  quantity: number | string
  reason: AdjustmentReason
  notes?: string | null
}

// --- API response DTOs (camelCase) ---------------------------------------

export interface BranchInventoryResponse {
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

export interface BranchInventoryListResponse {
  data: BranchInventoryResponse[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface InventoryLedgerResponse {
  id: string
  tenantId: string
  branchId: string
  productId: string
  movementType: MovementType
  quantityDelta: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
  createdBy: string | null
}

export interface ProductionBatchResponse {
  id: string
  tenantId: string
  branchId: string
  batchNumber: string
  rawInputLiters: number | null
  outputProductId: string
  outputQuantity: number
  operatorId: string
  qualityCheckPassed: boolean
  qualityNotes: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductionBatchDetailsResponse extends ProductionBatchResponse {
  ledgerEntries: { movementType: MovementType; quantityDelta: number; notes: string | null }[]
}

export interface StockTransferItemResponse {
  id: string
  productId: string
  containerId: string | null
  quantitySent: number
  quantityReceived: number | null
  notes: string | null
}

export interface StockTransferResponse {
  id: string
  tenantId: string
  originBranchId: string
  destinationBranchId: string
  status: StockTransferStatus
  requestedBy: string
  approvedBy: string | null
  notes: string | null
  shippedAt: string | null
  receivedAt: string | null
  createdAt: string
  updatedAt: string
  items: StockTransferItemResponse[]
}

export interface LowStockAlertResponse {
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

export interface StockCountItemResponse {
  id: string
  productId: string
  bookQuantity: number
  countedQuantity: number
  variance: number
  varianceAmount: number | null
  notes: string | null
  adjustmentApproved: boolean
  approvedBy: string | null
  createdAt: string
}

export interface StockCountSessionResponse {
  id: string
  tenantId: string
  branchId: string
  status: StockCountStatus
  initiatedBy: string
  approvedBy: string | null
  notes: string | null
  createdAt: string
  submittedAt: string | null
  approvedAt: string | null
  items: StockCountItemResponse[]
}

export interface InventoryAdjustmentResponse {
  id: string
  tenantId: string
  branchId: string
  productId: string
  quantity: number
  reason: AdjustmentReason
  notes: string | null
  createdAt: string
  createdBy: string | null
}

// --- Query / pagination / context ----------------------------------------

export interface BranchInventoryListQuery {
  page?: number
  limit?: number
  productId?: string
  search?: string
  lowStock?: boolean
  sortBy?: 'created_at' | 'updated_at' | 'product_id' | 'quantity_on_hand'
  sortOrder?: 'asc' | 'desc'
}

export interface StockTransferListQuery {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export interface StockTransferListResponse {
  data: StockTransferResponse[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface InventoryLedgerListQuery {
  page?: number
  limit?: number
  productId?: string
  movementType?: string
  startDate?: string
  endDate?: string
}

export interface InventoryContext {
  tenantId: string
  branchId: string | null
  userId: string
}

export interface InventoryAdjustmentListQuery {
  page?: number
  limit?: number
  productId?: string
  reason?: AdjustmentReason
}

export interface ProductionBatchListQuery {
  page?: number
  limit?: number
  status?: string
  search?: string
  sortBy?: 'created_at' | 'started_at' | 'completed_at' | 'batch_number'
  sortOrder?: 'asc' | 'desc'
}

export interface LowStockAlertQuery {
  branchId?: string
}

export interface InventoryUpdateRequest {
  id: string
  tenant_id: string
  branch_id: string
  product_id: string
  requested_by: string
  approved_by: string | null
  previous_quantity: number
  requested_quantity: number
  approved_quantity: number | null
  notes: string | null
  status: InventoryUpdateRequestStatus
  reviewed_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
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
