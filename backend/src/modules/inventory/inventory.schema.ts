import { z } from 'zod'
import { AdjustmentReason, MovementType, StockTransferStatus, StockCountStatus, ProductionBatchStatus } from './inventory.types'

/**
 * Reusable schema for numeric/decimal fields.  The API accepts either a raw
 * number or a numeric string (clients frequently send decimals as strings to
 * avoid IEEE-754 float precision loss, per AI_PROJECT_RULES.md §4.1).
 */
const decimalField = z.union([z.number(), z.string()])
const quantityField = z.union([z.number().int(), z.string().transform((s) => parseInt(s, 10))]).refine((n) => n >= 0, {
  message: 'Quantity must be a non-negative integer',
})

// --- Adjustment reason enum ------------------------------------------------
const ADJUSTMENT_REASON_VALUES: [AdjustmentReason, ...AdjustmentReason[]] = [
  'DAMAGE',
  'EXPIRED',
  'LOST',
  'MANUAL',
  'OPENING_BALANCE',
]
const adjustmentReasonSchema = z.enum(ADJUSTMENT_REASON_VALUES)

// --- Movement type enum ----------------------------------------------------
const MOVEMENT_TYPE_VALUES: [MovementType, ...MovementType[]] = [
  'SALE',
  'PURCHASE',
  'PRODUCTION',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'ADJUSTMENT',
  'WRITE_OFF',
  'RETURN',
  'CLEANING',
  'FILLING',
  'INSPECTION',
]
const movementTypeSchema = z.enum(MOVEMENT_TYPE_VALUES)

// --- Stock transfer status -------------------------------------------------
const STOCK_TRANSFER_STATUS_VALUES: [StockTransferStatus, ...StockTransferStatus[]] = [
  'PENDING',
  'APPROVED',
  'IN_TRANSIT',
  'RECEIVED',
  'DISCREPANCY',
  'CANCELLED',
]
const transferStatusEnumSchema = z.enum(STOCK_TRANSFER_STATUS_VALUES)

// --- Stock count status ----------------------------------------------------
const STOCK_COUNT_STATUS_VALUES: [StockCountStatus, ...StockCountStatus[]] = [
  'OPEN',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
]
const stockCountStatusSchema = z.enum(STOCK_COUNT_STATUS_VALUES)

// --- Production batch status -----------------------------------------------
const PRODUCTION_BATCH_STATUS_VALUES: [ProductionBatchStatus, ...ProductionBatchStatus[]] = [
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]
const productionBatchStatusSchema = z.enum(PRODUCTION_BATCH_STATUS_VALUES)

// --- UUID param schema -----------------------------------------------------
const uuidString = z.string().uuid('Invalid UUID')

// --- Branch inventory ------------------------------------------------------

export const createBranchInventorySchema = z.object({
  productId: uuidString,
  branchId: uuidString.optional(),
  quantityOnHand: z.number().int().nonnegative().optional().default(0),
  reservedQuantity: z.number().int().nonnegative().optional().default(0),
})

export const updateBranchInventorySchema = z.object({
  params: z.object({
    inventoryId: uuidString,
  }),
  body: z.object({
    quantityOnHand: z.number().int().nonnegative().optional(),
    reservedQuantity: z.number().int().nonnegative().optional(),
    lastCountedAt: z.string().datetime().optional().nullable(),
  }),
})

export const branchInventoryIdSchema = z.object({
  params: z.object({
    inventoryId: uuidString,
  }),
})

export const branchInventoryListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    productId: uuidString.optional(),
    search: z.string().optional(),
    lowStock: z.preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'true') return true
        if (val.toLowerCase() === 'false') return false
      }
      return Boolean(val)
    }, z.boolean()).optional(),
    sortBy: z.enum(['created_at', 'updated_at', 'product_id', 'quantity_on_hand']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
})

// --- Production batch ------------------------------------------------------

export const createProductionBatchSchema = z.object({
  batchNumber: z.string().min(1).max(100),
  outputProductId: uuidString,
  outputQuantity: z.number().int().positive('Output quantity must be positive'),
  rawInputLiters: decimalField.optional().nullable(),
  qualityCheckPassed: z.boolean().default(false),
  qualityNotes: z.string().optional().nullable(),
})

export const productionBatchIdSchema = z.object({
  params: z.object({
    batchId: uuidString,
  }),
})

export const productionBatchListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['created_at', 'started_at', 'completed_at', 'batch_number']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
})

// --- Stock transfer --------------------------------------------------------

const stockTransferItemSchema = z.object({
  productId: uuidString,
  quantity: z.number().int().positive('Quantity must be positive'),
  containerId: uuidString.optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const createStockTransferSchema = z.object({
  destinationBranchId: uuidString,
  items: z.array(stockTransferItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional().nullable(),
})

export const stockTransferIdSchema = z.object({
  params: z.object({
    transferId: uuidString,
  }),
})

export const stockTransferStatusSchema = z.object({
  params: z.object({
    transferId: uuidString,
  }),
  body: z.object({
    status: transferStatusEnumSchema,
    notes: z.string().optional().nullable(),
  }),
})

export const stockTransferListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: stockTransferStatusSchema.optional(),
    search: z.string().optional(),
  }),
})

// --- Stock count -----------------------------------------------------------

export const createStockCountSchema = z.object({
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: uuidString,
        countedQuantity: z.number().int().nonnegative('Counted quantity must be non-negative'),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1, 'At least one item is required'),
})

export const createStockCountSessionSchema = z.object({
  notes: z.string().optional().nullable(),
})

export const createStockCountItemsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: uuidString,
        countedQuantity: z.number().int().nonnegative('Counted quantity must be non-negative'),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1, 'At least one item is required'),
})

export const stockCountSessionIdSchema = z.object({
  params: z.object({
    sessionId: uuidString,
  }),
})

// --- Inventory adjustment --------------------------------------------------

export const createInventoryAdjustmentSchema = z.object({
  productId: uuidString,
  quantity: quantityField,
  reason: adjustmentReasonSchema,
  notes: z.string().optional().nullable(),
})

export const inventoryAdjustmentIdSchema = z.object({
  params: z.object({
    adjustmentId: uuidString,
  }),
})

export const inventoryAdjustmentListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    productId: uuidString.optional(),
    reason: adjustmentReasonSchema.optional(),
  }),
})

// --- Inventory ledger ------------------------------------------------------

export const inventoryLedgerIdSchema = z.object({
  params: z.object({
    ledgerId: uuidString,
  }),
})

export const inventoryLedgerListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    productId: uuidString.optional(),
    movementType: movementTypeSchema.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
})
