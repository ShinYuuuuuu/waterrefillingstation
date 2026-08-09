import {
  BranchInventory,
  BranchInventoryResponse,
  InventoryAdjustmentResponse,
  InventoryLedger,
  InventoryLedgerResponse,
  ProductionBatch,
  ProductionBatchResponse,
  ProductionBatchDetailsResponse,
  StockCountItem,
  StockCountItemResponse,
  StockCountSession,
  StockCountSessionResponse,
  StockTransfer,
  StockTransferItem,
  StockTransferItemResponse,
  StockTransferResponse,
  LowStockAlertResponse,
  CreateBranchInventoryRequest,
  UpdateBranchInventoryRequest,
  InventoryContext,
  AdjustmentReason,
  MovementType,
} from './inventory.types'
import { Product } from '../product/product.types'

/**
 * Maps between database entities (snake_case, Prisma output) and camelCase
 * API DTOs.  Controllers never leak Prisma field names to the client.
 */
export class InventoryMapper {
  // -----------------------------------------------------------------------
  // Branch Inventory
  // -----------------------------------------------------------------------

  /** DB entity → API response DTO */
  static toBranchInventoryResponse(entity: BranchInventory & {
    product?: Product
  }): BranchInventoryResponse {
    const quantityOnHand = entity.quantity_on_hand
    const reservedQuantity = entity.reserved_quantity
    const reorderLevel = entity.product?.reorder_level ?? 0
    const reorderQuantity = 1 // default reorder qty; could be product-level
    return {
      id: entity.id,
      tenantId: entity.tenant_id,
      branchId: entity.branch_id,
      productId: entity.product_id,
      productName: entity.product?.name ?? '',
      productSku: entity.product?.sku ?? '',
      quantityOnHand,
      reservedQuantity,
      availableQuantity: quantityOnHand,
      reorderLevel,
      reorderQuantity,
      lastCountedAt: entity.last_counted_at?.toISOString() ?? null,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    }
  }

  /** API create payload → Prisma write input (snake_case) */
  static toBranchInventoryCreateInput(
    data: CreateBranchInventoryRequest,
    ctx: InventoryContext,
  ): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      branch_id: data.branchId ?? ctx.branchId,
      product_id: data.productId,
      quantity_on_hand: data.quantityOnHand ?? 0,
      reserved_quantity: data.reservedQuantity ?? 0,
    }
  }

  /** API update payload → Prisma write input (snake_case) */
  static toBranchInventoryUpdateInput(data: UpdateBranchInventoryRequest): Record<string, unknown> {
    const input: Record<string, unknown> = { updated_at: new Date() }
    if (data.quantityOnHand !== undefined) input.quantity_on_hand = data.quantityOnHand
    if (data.reservedQuantity !== undefined) input.reserved_quantity = data.reservedQuantity
    if (data.lastCountedAt !== undefined) {
      input.last_counted_at = data.lastCountedAt === null ? null : new Date(data.lastCountedAt)
    }
    return input
  }

  // -----------------------------------------------------------------------
  // Inventory Ledger
  // -----------------------------------------------------------------------

  /** DB entity → API response DTO */
  static toLedgerResponse(entity: InventoryLedger): InventoryLedgerResponse {
    return {
      id: entity.id,
      tenantId: entity.tenant_id,
      branchId: entity.branch_id,
      productId: entity.product_id,
      movementType: entity.movement_type,
      quantityDelta: entity.quantity_delta,
      referenceType: entity.reference_type,
      referenceId: entity.reference_id,
      notes: entity.notes,
      createdAt: entity.created_at.toISOString(),
      createdBy: entity.created_by,
    }
  }

  // -----------------------------------------------------------------------
  // Production Batch
  // -----------------------------------------------------------------------

  /** DB entity → API response DTO */
  static toProductionBatchResponse(entity: ProductionBatch): ProductionBatchResponse {
    return {
      id: entity.id,
      tenantId: entity.tenant_id,
      branchId: entity.branch_id,
      batchNumber: entity.batch_number,
      rawInputLiters: entity.raw_input_liters != null ? Number(entity.raw_input_liters) : null,
      outputProductId: entity.output_product_id,
      outputQuantity: entity.output_quantity,
      operatorId: entity.operator_id,
      qualityCheckPassed: entity.quality_check_passed,
      qualityNotes: entity.quality_notes,
      startedAt: entity.started_at.toISOString(),
      completedAt: entity.completed_at?.toISOString() ?? null,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    }
  }

  /** DB entity + ledger entries → API response with details */
  static toProductionBatchDetailsResponse(
    entity: ProductionBatch,
    ledgerEntries: { movement_type: string; quantity_delta: number; notes: string | null }[],
  ): ProductionBatchDetailsResponse {
    const base = this.toProductionBatchResponse(entity)
    return {
      ...base,
      ledgerEntries: ledgerEntries.map((l) => ({
        movementType: l.movement_type as MovementType,
        quantityDelta: l.quantity_delta,
        notes: l.notes,
      })),
    }
  }

  /** API create payload → Prisma write input */
  static toProductionBatchCreateInput(
    data: { batchNumber: string; outputProductId: string; outputQuantity: number; rawInputLiters?: number | string | null; qualityCheckPassed?: boolean; qualityNotes?: string | null },
    ctx: InventoryContext,
  ): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      branch_id: ctx.branchId,
      batch_number: data.batchNumber,
      output_product_id: data.outputProductId,
      output_quantity: data.outputQuantity,
      operator_id: ctx.userId,
      quality_check_passed: data.qualityCheckPassed ?? false,
      quality_notes: data.qualityNotes ?? null,
      raw_input_liters:
        data.rawInputLiters != null
          ? typeof data.rawInputLiters === 'string'
            ? data.rawInputLiters
            : data.rawInputLiters
          : null,
      started_at: new Date(),
    }
  }

  // -----------------------------------------------------------------------
  // Stock Transfer
  // -----------------------------------------------------------------------

  /** DB entity + items → API response DTO */
  static toStockTransferResponse(entity: StockTransfer, items: StockTransferItem[]): StockTransferResponse {
    return {
      id: entity.id,
      tenantId: entity.tenant_id,
      originBranchId: entity.origin_branch_id,
      destinationBranchId: entity.destination_branch_id,
      status: entity.status,
      requestedBy: entity.requested_by,
      approvedBy: entity.approved_by,
      notes: entity.notes,
      shippedAt: entity.shipped_at?.toISOString() ?? null,
      receivedAt: entity.received_at?.toISOString() ?? null,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
      items: items.map(InventoryMapper.toStockTransferItemResponse),
    }
  }

  /** DB item entity → API item DTO */
  static toStockTransferItemResponse(entity: StockTransferItem): StockTransferItemResponse {
    return {
      id: entity.id,
      productId: entity.product_id,
      containerId: entity.container_id,
      quantitySent: entity.quantity_sent,
      quantityReceived: entity.quantity_received,
      notes: entity.notes,
    }
  }

  // -----------------------------------------------------------------------
  // Stock Count
  // -----------------------------------------------------------------------

  /** DB item entity → API item DTO */
  static toStockCountItemResponse(entity: StockCountItem): StockCountItemResponse {
    return {
      id: entity.id,
      productId: entity.product_id,
      bookQuantity: entity.book_quantity,
      countedQuantity: entity.counted_quantity,
      variance: entity.variance,
      varianceAmount: entity.variance_amount != null ? Number(entity.variance_amount) : null,
      notes: entity.notes,
      adjustmentApproved: entity.adjustment_approved,
      approvedBy: entity.approved_by,
      createdAt: entity.created_at.toISOString(),
    }
  }

  /** DB session entity + items → API response DTO */
  static toStockCountSessionResponse(
    entity: StockCountSession,
    items: StockCountItem[],
  ): StockCountSessionResponse {
    return {
      id: entity.id,
      tenantId: entity.tenant_id,
      branchId: entity.branch_id,
      status: entity.status,
      initiatedBy: entity.initiated_by,
      approvedBy: entity.approved_by,
      notes: entity.notes,
      createdAt: entity.created_at.toISOString(),
      submittedAt: entity.submitted_at?.toISOString() ?? null,
      approvedAt: entity.approved_at?.toISOString() ?? null,
      items: items.map(InventoryMapper.toStockCountItemResponse),
    }
  }

  // -----------------------------------------------------------------------
  // Inventory Adjustment
  // -----------------------------------------------------------------------

  /**
   * Creates a ledger-compatible reference for an adjustment.
   * Used by the service to write the ledger entry.
   */
  static adjustmentReasonToMovementType(reason: AdjustmentReason): string {
    // All adjustments use ADJUSTMENT as the movement type
    // The reason is encoded in the notes field
    return 'ADJUSTMENT'
  }

  // -----------------------------------------------------------------------
  // Low Stock Alert
  // -----------------------------------------------------------------------

  /** DB entities → API alert DTO */
  static toLowStockAlertResponse(
    inventory: BranchInventory & {
      product?: { name: string; reorder_level: number; sku: string }
      branch?: { name: string }
    },
  ): LowStockAlertResponse {
    const reorderLevel = inventory.product?.reorder_level ?? 0
    return {
      productId: inventory.product_id,
      productName: inventory.product?.name ?? 'Unknown',
      branchId: inventory.branch_id,
      branchName: inventory.branch?.name ?? 'Unknown',
      quantityOnHand: inventory.quantity_on_hand,
      reservedQuantity: inventory.reserved_quantity,
      availableQuantity: inventory.quantity_on_hand,
      reorderLevel,
      reorderQuantity: 1,
    }
  }
}
