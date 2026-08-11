import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { NotFoundError } from '../../middleware/errorHandler'
import { pagination } from '../../constants'
import {
  BranchInventory,
  BranchInventoryListQuery,
  InventoryContext,
  InventoryLedger,
  InventoryLedgerListQuery,
  CreateBranchInventoryRequest,
  UpdateBranchInventoryRequest,
  ProductionBatch,
  ProductionBatchListQuery,
  CreateProductionBatchRequest,
  StockTransfer,
  StockTransferItem,
  StockTransferListQuery,
  CreateStockTransferRequest,
  StockTransferStatus,
  StockCountSession,
  StockCountItem,
  CreateStockCountRequest,
  InventoryAdjustmentResponse,
  InventoryAdjustmentListQuery,
  AdjustmentReason,
  InventoryUpdateRequest,
  InventoryUpdateRequestStatus,
  CreateInventoryUpdateRequest,
  InventoryUpdateRequestListQuery,
} from './inventory.types'
import { InventoryMapper } from './inventory.mapper'

/**
 * Data-access layer for the Inventory Management module.
 *
 * All queries are scoped by `tenant_id` (multi-tenant isolation) and
 * `branch_id` (branch isolation) at the database level.  Soft deletes
 * (`deleted_at IS NULL`) are applied to every read query so that
 * historical data is preserved per AI_PROJECT_RULES.md §4.6.
 *
 * The repository is the only layer that touches Prisma for inventory data;
 * the service and controller layers never import `prisma` directly
 * (dependency inversion per §3.3).
 */
export class InventoryRepository {
  private readonly db = prisma

  // -----------------------------------------------------------------------
  // Scope helper
  // -----------------------------------------------------------------------

  private buildScopeWhere(ctx: InventoryContext, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      deleted_at: null,
      ...extra,
    }
  }

  // -----------------------------------------------------------------------
  // BRANCH INVENTORY — CRUD
  // -----------------------------------------------------------------------

  async findManyBranchInventory(
    query: BranchInventoryListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: (BranchInventory & { product?: { name: string; reorder_level: number; sku: string } })[]; total: number }> {
    const where = this.buildScopeWhere(ctx, {
      product: { is_active: true, deleted_at: null },
    })

    if (query.productId) {
      ;(where as Record<string, unknown>).product_id = query.productId
    }
    if (query.search) {
      ;(where as Record<string, unknown>).OR = [
        { product: { sku: { contains: query.search, mode: 'insensitive' } } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
      ]
    }
    if (query.lowStock) {
      // Filter for physical shop quantity <= reorder level in the service layer.
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit
    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy: Record<string, string> = { [sortBy]: sortOrder }

    const [total, data] = await this.db.$transaction([
      this.db.branchInventory.count({ where: this.sanitizeWhere(where) }),
      this.db.branchInventory.findMany({
        where: this.sanitizeWhere(where),
        skip,
        take: limit,
        orderBy,
        include: {
          product: {
            select: { name: true, reorder_level: true, sku: true },
          },
        },
      }),
    ])

    return { data, total }
  }

  /**
   * Sanitize the where clause by removing placeholder properties
   * that we don't want Prisma to interpret.
   */
  private sanitizeWhere(where: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...where }
    delete result.AND // remove placeholder
    if (result.OR && Array.isArray(result.OR) && result.OR.length === 0) {
      delete result.OR
    }
    return result
  }

  async findBranchInventoryById(id: string, ctx: InventoryContext): Promise<BranchInventory | null> {
    return this.db.branchInventory.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
      include: { product: true },
    })
  }

  async findBranchInventoryByProduct(productId: string, ctx: InventoryContext): Promise<BranchInventory | null> {
    return this.db.branchInventory.findFirst({
      where: this.buildScopeWhere(ctx, { product_id: productId }),
      include: { product: true },
    })
  }

  async createBranchInventory(
    data: CreateBranchInventoryRequest,
    ctx: InventoryContext,
  ): Promise<BranchInventory> {
    const input = InventoryMapper.toBranchInventoryCreateInput(data, ctx)

    // Check if a record for this branch+product already exists
    const existing = await this.db.branchInventory.findFirst({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: input.branch_id as string,
        product_id: input.product_id as string,
        deleted_at: null,
      },
    })

    let created: BranchInventory
    if (existing) {
      // Update existing record
      created = await this.db.branchInventory.update({
        where: { id: existing.id },
        data: {
          quantity_on_hand: { increment: Number(input.quantity_on_hand) || 0 },
          reserved_quantity: Number(input.reserved_quantity) || 0,
          updated_at: new Date(),
        },
      }) as BranchInventory
    } else {
      // Create new record
      created = await this.db.branchInventory.create({ data: input }) as BranchInventory
    }
    logger.debug('Branch inventory created/updated', { id: created.id, tenantId: ctx.tenantId })
    return this.db.branchInventory.findUniqueOrThrow({
      where: { id: created.id },
      include: { product: true },
    }) as unknown as BranchInventory
  }

  async updateBranchInventory(
    id: string,
    data: UpdateBranchInventoryRequest,
    ctx: InventoryContext,
  ): Promise<BranchInventory> {
    const existing = await this.findBranchInventoryById(id, ctx)
    if (!existing) {
      throw new NotFoundError('BranchInventory')
    }

    const input = InventoryMapper.toBranchInventoryUpdateInput(data)

    const updated = await this.db.branchInventory.update({
      where: { id },
      data: input,
    })
    logger.debug('Branch inventory updated', { id, tenantId: ctx.tenantId })
    return this.db.branchInventory.findUniqueOrThrow({
      where: { id: updated.id },
      include: { product: true },
    }) as unknown as BranchInventory
  }

  async removeBranchInventory(id: string, ctx: InventoryContext): Promise<BranchInventory> {
    const existing = await this.findBranchInventoryById(id, ctx)
    if (!existing) {
      throw new NotFoundError('BranchInventory')
    }

    const removed = await this.db.branchInventory.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    })
    logger.debug('Branch inventory soft-deleted', { id, tenantId: ctx.tenantId })
    return removed as BranchInventory
  }

  // -----------------------------------------------------------------------
  // LOW STOCK ALERTS
  // -----------------------------------------------------------------------

  async findLowStockAlerts(ctx: InventoryContext, branchId?: string): Promise<(BranchInventory & { product?: { name: string; reorder_level: number; sku: string }; branch?: { name: string } })[]> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      product: { is_active: true, deleted_at: null },
    }
    if (branchId) {
      ;(where as Record<string, unknown>).branch_id = branchId
    } else if (ctx.branchId) {
      ;(where as Record<string, unknown>).branch_id = ctx.branchId
    }

    const results = await this.db.branchInventory.findMany({
      where,
      include: {
        product: { select: { name: true, reorder_level: true, sku: true } },
        branch: { select: { name: true } },
      },
    })

    // The shop records its physical count directly; low stock is based on the
    // number actually at the shop, not legacy reservation bookkeeping.
    return results.filter((inv: any) => {
      const reorderLevel = inv.product?.reorder_level ?? 0
      return inv.quantity_on_hand <= reorderLevel
    })
  }

  // -----------------------------------------------------------------------
  // INVENTORY LEDGER
  // -----------------------------------------------------------------------

  async createLedgerEntry(params: {
    tenantId: string
    branchId: string
    productId: string
    movementType: string
    quantityDelta: number
    referenceType?: string | null
    referenceId?: string | null
    notes?: string | null
    userId?: string | null
  }): Promise<InventoryLedger> {
    const entry = await this.db.inventoryLedger.create({
      data: {
        tenant_id: params.tenantId,
        branch_id: params.branchId,
        product_id: params.productId,
        movement_type: params.movementType as any,
        quantity_delta: params.quantityDelta,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        notes: params.notes,
        created_by: params.userId,
      },
    })
    logger.debug('Inventory ledger entry created', {
      movementType: params.movementType,
      productId: params.productId,
      quantityDelta: params.quantityDelta,
    })
    return entry as InventoryLedger
  }

  async findManyLedger(
    query: InventoryLedgerListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: InventoryLedger[]; total: number }> {
    const where: Record<string, unknown> = this.buildScopeWhere(ctx)

    if (query.productId) (where as Record<string, unknown>).product_id = query.productId
    if (query.movementType) (where as Record<string, unknown>).movement_type = query.movementType
    if (query.startDate) {
      const createdFilter = (where as Record<string, unknown>).created_at as { gte?: Date; lte?: Date } | undefined
      if (createdFilter) {
        createdFilter.gte = new Date(query.startDate)
      } else {
        ;(where as Record<string, unknown>).created_at = { gte: new Date(query.startDate) }
      }
    }
    if (query.endDate) {
      const createdFilter = (where as Record<string, unknown>).created_at as { gte?: Date; lte?: Date } | undefined
      if (createdFilter) {
        createdFilter.lte = new Date(query.endDate)
      } else {
        ;(where as Record<string, unknown>).created_at = { lte: new Date(query.endDate) }
      }
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit

    const [total, data] = await this.db.$transaction([
      this.db.inventoryLedger.count({ where }),
      this.db.inventoryLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
    ])

    return { data: data as InventoryLedger[], total }
  }

  // -----------------------------------------------------------------------
  // PRODUCTION BATCH
  // -----------------------------------------------------------------------

  async findManyProductionBatches(
    query: ProductionBatchListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: ProductionBatch[]; total: number }> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
    }

    if (query.status === 'COMPLETED') {
      (where as Record<string, unknown>).completed_at = { not: null }
    } else if (query.status === 'IN_PROGRESS') {
      (where as Record<string, unknown>).completed_at = null
    } else if (query.status === 'CANCELLED') {
      // Cancelled batches are soft-deleted, so they won't appear unless we include deleted ones
      // Skip this filter for now
    }
    if (query.search) {
      ;(where as Record<string, unknown>).OR = [
        { batch_number: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit

    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy: Record<string, string> = { [sortBy]: sortOrder }

    const [total, data] = await this.db.$transaction([
      this.db.productionBatch.count({ where }),
      this.db.productionBatch.findMany({ where, skip, take: limit, orderBy }),
    ])

    return { data: data as ProductionBatch[], total }
  }

  async findProductionBatchById(id: string, ctx: InventoryContext): Promise<ProductionBatch | null> {
    return this.db.productionBatch.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
    })
  }

  async createProductionBatch(
    data: CreateProductionBatchRequest,
    ctx: InventoryContext,
  ): Promise<ProductionBatch> {
    const input = InventoryMapper.toProductionBatchCreateInput(data as any, ctx)

    // Check uniqueness of batch number within tenant
    const existing = await this.db.productionBatch.findFirst({
      where: {
        tenant_id: ctx.tenantId,
        batch_number: data.batchNumber,
        deleted_at: null,
      },
    })
    if (existing) {
      const { AppError } = await import('../../middleware/errorHandler')
      const { httpStatus } = await import('../../constants')
      throw new AppError(httpStatus.CONFLICT, `Batch number '${data.batchNumber}' already exists`)
    }

    const batch = await this.db.productionBatch.create({
      data: input,
    })

    // Create ledger entry for production
    await this.createLedgerEntry({
      tenantId: ctx.tenantId,
      branchId: input.branch_id as string,
      productId: data.outputProductId,
      movementType: 'PRODUCTION',
      quantityDelta: data.outputQuantity,
      referenceType: 'ProductionBatch',
      referenceId: batch.id,
      notes: `Batch ${data.batchNumber}: produced ${data.outputQuantity} units`,
      userId: ctx.userId,
    })

    logger.debug('Production batch created', { id: batch.id, batchNumber: data.batchNumber })
    return batch as ProductionBatch
  }

  async completeProductionBatch(id: string, ctx: InventoryContext): Promise<ProductionBatch> {
    const existing = await this.findProductionBatchById(id, ctx)
    if (!existing) {
      throw new NotFoundError('ProductionBatch')
    }

    const updated = await this.db.productionBatch.update({
      where: { id },
      data: { completed_at: new Date(), updated_at: new Date() },
    })
    logger.debug('Production batch completed', { id })
    return updated as ProductionBatch
  }

  async cancelProductionBatch(id: string, ctx: InventoryContext): Promise<ProductionBatch> {
    const existing = await this.findProductionBatchById(id, ctx)
    if (!existing) {
      throw new NotFoundError('ProductionBatch')
    }

    const updated = await this.db.productionBatch.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    })
    logger.debug('Production batch cancelled', { id })
    return updated as ProductionBatch
  }

  // -----------------------------------------------------------------------
  // STOCK TRANSFER
  // -----------------------------------------------------------------------

  async findManyStockTransfers(
    query: StockTransferListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: StockTransfer[]; total: number }> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...(ctx.branchId
        ? {
            OR: [
              { origin_branch_id: ctx.branchId },
              { destination_branch_id: ctx.branchId },
            ],
          }
        : {}),
    }

    if (query.status) (where as Record<string, unknown>).status = query.status

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit

    const [total, data] = await this.db.$transaction([
      this.db.stockTransfer.count({ where }),
      this.db.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { items: true },
      }),
    ])

    return { data: data as StockTransfer[], total }
  }

  async findStockTransferById(id: string, ctx: InventoryContext): Promise<(StockTransfer & { items: StockTransferItem[] }) | null> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      id,
    }
    return this.db.stockTransfer.findFirst({
      where,
      include: { items: true },
    }) as Promise<(StockTransfer & { items: StockTransferItem[] }) | null>
  }

  async createStockTransfer(
    data: CreateStockTransferRequest,
    ctx: InventoryContext,
  ): Promise<StockTransfer & { items: StockTransferItem[] }> {
    if (!ctx.branchId) {
      const { AppError } = await import('../../middleware/errorHandler')
      const { httpStatus } = await import('../../constants')
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to create a stock transfer')
    }

    if (ctx.branchId === data.destinationBranchId) {
      const { AppError } = await import('../../middleware/errorHandler')
      const { httpStatus } = await import('../../constants')
      throw new AppError(httpStatus.BAD_REQUEST, 'Origin and destination branches must be different')
    }

    // Validate destination branch belongs to the same tenant
    const destBranch = await this.db.branch.findFirst({
      where: { id: data.destinationBranchId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!destBranch) {
      const { NotFoundError } = await import('../../middleware/errorHandler')
      throw new NotFoundError('Branch')
    }

    // Validate origin branch exists (if HQ context without branchId this may skip)
    const originBranch = await this.db.branch.findFirst({
      where: { id: ctx.branchId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!originBranch) {
      const { NotFoundError } = await import('../../middleware/errorHandler')
      throw new NotFoundError('Branch')
    }

    // Validate all products exist and belong to tenant
    for (const item of data.items) {
      const product = await this.db.product.findFirst({
        where: { id: item.productId, tenant_id: ctx.tenantId, deleted_at: null },
      })
      if (!product) {
        throw new NotFoundError('Product')
      }

      // Check sufficient stock at origin
      const inventory = await this.db.branchInventory.findFirst({
        where: {
          tenant_id: ctx.tenantId,
          branch_id: ctx.branchId,
          product_id: item.productId,
          deleted_at: null,
        },
      })
      if (!inventory || inventory.quantity_on_hand < item.quantity) {
        const { AppError } = await import('../../middleware/errorHandler')
        const { httpStatus } = await import('../../constants')
        throw new AppError(
          httpStatus.CONFLICT,
          `Insufficient stock for product ${item.productId}: have ${inventory?.quantity_on_hand ?? 0}, need ${item.quantity}`,
        )
      }
    }

    const transfer = await this.db.stockTransfer.create({
      data: {
        tenant_id: ctx.tenantId,
        origin_branch_id: ctx.branchId,
        destination_branch_id: data.destinationBranchId,
        requested_by: ctx.userId,
        status: 'PENDING' as StockTransferStatus,
        notes: data.notes ?? undefined,
        items: {
          create: data.items.map((item) => ({
            product_id: item.productId,
            container_id: item.containerId ?? undefined,
            quantity_sent: item.quantity,
            quantity_received: null,
            notes: item.notes ?? undefined,
          })),
        },
      },
      include: { items: true },
    })

    logger.debug('Stock transfer created', { id: transfer.id, tenantId: ctx.tenantId })
    return transfer as unknown as StockTransfer & { items: StockTransferItem[] }
  }

  async updateStockTransferStatus(
    id: string,
    status: StockTransferStatus,
    ctx: InventoryContext,
    notes?: string | null,
  ): Promise<StockTransfer & { items: StockTransferItem[] }> {
    const existing = await this.findStockTransferById(id, ctx)
    if (!existing) {
      throw new NotFoundError('StockTransfer')
    }

    // Validate transition
    const { STOCK_TRANSFER_TRANSITIONS } = await import('./inventory.types')
    const allowed = STOCK_TRANSFER_TRANSITIONS[existing.status as StockTransferStatus]
    if (!allowed.includes(status)) {
      const { AppError } = await import('../../middleware/errorHandler')
      const { httpStatus } = await import('../../constants')
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        `Invalid status transition: ${existing.status} → ${status}`,
      )
    }

    // Apply side effects based on new status
    const now = new Date()
    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
    }

     if (status === 'APPROVED') {
       updateData.approved_by = ctx.userId
     } else if (status === 'IN_TRANSIT') {
       updateData.shipped_at = now
       // Deduct from origin, create TRANSFER_OUT ledger
       await this.applyStockTransferMovement(existing, 'OUT', ctx.userId)
     } else if (status === 'RECEIVED') {
       updateData.received_at = now
       // Add to destination, create TRANSFER_IN ledger
       await this.applyStockTransferMovement(existing, 'IN', ctx.userId)
     } else if (status === 'CANCELLED') {
      // No stock movements for cancellation
    } else if (status === 'DISCREPANCY') {
      // No stock movements for discrepancy
    }

    const updated = await this.db.stockTransfer.update({
      where: { id },
      data: updateData,
      include: { items: true },
    })

    // If notes are provided, update them
    if (notes) {
      await this.db.stockTransfer.update({
        where: { id },
        data: { notes },
      })
    }

    logger.debug('Stock transfer status updated', { id, status })
    return updated as unknown as StockTransfer & { items: StockTransferItem[] }
  }

  /**
   * Applies the stock movement for a transfer — deducting from origin or
   * adding to destination, and creating matching ledger entries.
   */
  private async applyStockTransferMovement(
    transfer: StockTransfer & { items: StockTransferItem[] },
    direction: 'IN' | 'OUT',
    userId: string,
  ): Promise<void> {
    const { createLedgerEntry } = this
    const movementType = direction === 'IN' ? 'TRANSFER_IN' : 'TRANSFER_OUT'
    const targetBranchId = direction === 'IN' ? transfer.destination_branch_id : transfer.origin_branch_id

    await this.db.$transaction(async (tx: any) => {
      for (const item of transfer.items) {
        // Update branch inventory
        const inventory = await tx.branchInventory.findFirst({
          where: {
            tenant_id: transfer.tenant_id,
            branch_id: targetBranchId,
            product_id: item.product_id,
            deleted_at: null,
          },
        })

        if (inventory) {
          const delta = direction === 'IN' ? item.quantity_sent : -item.quantity_sent
          await tx.branchInventory.update({
            where: { id: inventory.id },
            data: {
              quantity_on_hand: { increment: delta },
              updated_at: new Date(),
            },
          })
        } else if (direction === 'IN') {
          // Create inventory record if it doesn't exist at destination
          await tx.branchInventory.create({
            data: {
              tenant_id: transfer.tenant_id,
              branch_id: targetBranchId,
              product_id: item.product_id,
              quantity_on_hand: item.quantity_sent,
              reserved_quantity: 0,
            },
          })
        }

        await tx.inventoryLedger.create({
          data: {
            tenant_id: transfer.tenant_id,
            branch_id: targetBranchId,
            product_id: item.product_id,
            movement_type: movementType as any,
            quantity_delta: direction === 'IN' ? item.quantity_sent : -item.quantity_sent,
            reference_type: 'StockTransfer',
            reference_id: transfer.id,
            created_by: userId,
            notes: `Stock transfer ${transfer.id} (${direction})`,
          },
        })
      }
    })
  }

  // -----------------------------------------------------------------------
  // STOCK COUNT
  // -----------------------------------------------------------------------

  async createStockCountSession(ctx: InventoryContext, notes?: string | null): Promise<StockCountSession> {
    if (!ctx.branchId) {
      const { AppError } = await import('../../middleware/errorHandler')
      const { httpStatus } = await import('../../constants')
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to start a stock count')
    }

    const session = await this.db.stockCountSession.create({
      data: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId,
        initiated_by: ctx.userId,
        notes: notes ?? undefined,
        status: 'OPEN',
      },
    })

    logger.debug('Stock count session created', { id: session.id, tenantId: ctx.tenantId })
    return session as StockCountSession
  }

  async addStockCountItems(
    sessionId: string,
    items: { productId: string; countedQuantity: number; notes?: string | null }[],
    ctx: InventoryContext,
  ): Promise<void> {
    // Fetch all products in the branch's inventory for this session
    const inventories = await this.db.branchInventory.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId,
        deleted_at: null,
      },
    })

    // If no specific items provided, create items for all branch inventory
    if (items.length === 0) {
       items = inventories.map((inv: any) => ({
        productId: inv.product_id,
        countedQuantity: inv.quantity_on_hand,
      }))
    }

    const createdItems = items.map((item: { productId: string; countedQuantity: number; notes?: string | null }, idx: number) => {
      const bookInv = inventories.find((i: any) => i.product_id === item.productId)
      const bookQty = bookInv?.quantity_on_hand ?? 0
      const countedQty = item.countedQuantity
      const variance = countedQty - bookQty

      return {
        session_id: sessionId,
        product_id: item.productId,
        book_quantity: bookQty,
        counted_quantity: countedQty,
        variance,
        notes: item.notes ?? undefined,
      }
    })

    await this.db.stockCountItem.createMany({
      data: createdItems,
    })
  }

  async calculateStockCountVariance(sessionId: string, ctx: InventoryContext): Promise<StockCountItem[]> {
    // Variance is already calculated at creation time, but we compute it here
    // for any items that may have been added later
    const items = await this.db.stockCountItem.findMany({
      where: { session: { id: sessionId } },
    })

    for (const item of items) {
      const variance = item.counted_quantity - item.book_quantity
      if (variance !== item.variance) {
        await this.db.stockCountItem.update({
          where: { id: item.id },
          data: { variance },
        })
      }
    }

    // Return updated items with variance
    return this.db.stockCountItem.findMany({
      where: { session_id: sessionId },
    }) as Promise<StockCountItem[]>
  }

  async submitStockCount(sessionId: string, ctx: InventoryContext): Promise<StockCountSession> {
    const session = await this.db.stockCountSession.findFirst({
      where: { id: sessionId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!session) throw new NotFoundError('StockCountSession')

    const updated = await this.db.stockCountSession.update({
      where: { id: sessionId },
      data: { status: 'SUBMITTED', submitted_at: new Date() },
    })
    return updated as StockCountSession
  }

  async approveStockCount(sessionId: string, ctx: InventoryContext): Promise<StockCountSession> {
    const session = await this.db.stockCountSession.findFirst({
      where: { id: sessionId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!session) throw new NotFoundError('StockCountSession')

    // Get all items and post adjustments
    const items = await this.db.stockCountItem.findMany({
      where: { session_id: sessionId },
    })

    await this.db.$transaction(async (tx: any) => {
      for (const item of items) {
        if (item.variance === 0) continue

        // Update branch inventory with counted quantity
        await tx.branchInventory.updateMany({
          where: {
            tenant_id: ctx.tenantId,
            branch_id: session.branch_id,
            product_id: item.product_id,
            deleted_at: null,
          },
          data: {
            quantity_on_hand: item.counted_quantity,
            last_counted_at: new Date(),
            updated_at: new Date(),
          },
        })

        // Create ledger entry for the adjustment
        await tx.inventoryLedger.create({
          data: {
            tenant_id: ctx.tenantId,
            branch_id: session.branch_id,
            product_id: item.product_id,
            movement_type: 'ADJUSTMENT',
            quantity_delta: item.variance,
            reference_type: 'StockCount',
            reference_id: sessionId,
            created_by: ctx.userId,
            notes: `Stock count adjustment: variance ${item.variance}`,
          },
        })

        // Mark item as adjustment approved
        await tx.stockCountItem.update({
          where: { id: item.id },
          data: {
            adjustment_approved: true,
            approved_by: ctx.userId,
          },
        })
      }

      await tx.stockCountSession.update({
        where: { id: sessionId },
        data: {
          status: 'APPROVED',
          approved_by: ctx.userId,
          approved_at: new Date(),
        },
      })
    })

    logger.info('Stock count approved and adjustments posted', { sessionId, tenantId: ctx.tenantId })

    return this.db.stockCountSession.findFirst({
      where: { id: sessionId },
    }) as Promise<StockCountSession>
  }

  async getStockCountSession(id: string, ctx: InventoryContext): Promise<(StockCountSession & { items: StockCountItem[] }) | null> {
    return this.db.stockCountSession.findFirst({
      where: {
        id,
        tenant_id: ctx.tenantId,
        deleted_at: null,
        ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      },
      include: { items: true },
    }) as Promise<(StockCountSession & { items: StockCountItem[] }) | null>
  }

  // -----------------------------------------------------------------------
  // INVENTORY ADJUSTMENT
  // -----------------------------------------------------------------------

  /**
   * Records an inventory adjustment: updates branch inventory quantity and
   * creates a ledger entry. Prevents negative inventory on deduction.
   */
  async createAdjustmentEntry(params: {
    inventoryId: string
    quantity: number
    reason: string
    notes?: string | null
    userId: string
    ctx: InventoryContext
  }): Promise<InventoryAdjustmentResponse> {
    const { inventoryId, quantity, reason, notes, userId, ctx } = params

    const positiveReasons = ['OPENING_BALANCE', 'MANUAL']
    const isAddition = positiveReasons.includes(reason)

    // For positive adjustments, also look for soft-deleted records
    // so they can be reactivated (e.g., OPENING_BALANCE for a previously
    // deleted inventory slot).
    const inventory = await this.db.branchInventory.findFirst({
      where: {
        id: inventoryId,
        tenant_id: ctx.tenantId,
        ...(isAddition ? {} : { deleted_at: null }),
        ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      },
      include: { product: true },
    })
    if (!inventory) {
      throw new NotFoundError('BranchInventory')
    }

     // Determine delta sign based on reason
     const delta = isAddition ? Math.abs(quantity) : -Math.abs(quantity)

    // Prevent negative inventory
    if (delta < 0 && inventory.quantity_on_hand + delta < 0) {
      const { AppError } = await import('../../middleware/errorHandler')
      const { httpStatus } = await import('../../constants')
      throw new AppError(
        httpStatus.CONFLICT,
        `Cannot reduce inventory below zero: current ${inventory.quantity_on_hand}, requested reduction ${Math.abs(delta)}`,
      )
    }

     await this.db.$transaction(async (tx: any) => {
       await tx.branchInventory.update({
         where: { id: inventoryId },
         data: {
           quantity_on_hand: { increment: delta },
           updated_at: new Date(),
           ...(isAddition ? { deleted_at: null } : {}),
         },
       })

      await tx.inventoryLedger.create({
        data: {
          tenant_id: ctx.tenantId,
          branch_id: inventory.branch_id,
          product_id: inventory.product_id,
          movement_type: 'ADJUSTMENT',
          quantity_delta: delta,
          reference_type: 'InventoryAdjustment',
          notes: notes || `Adjustment (${reason})`,
          created_by: userId,
        },
      })
    })

    logger.info('Inventory adjustment recorded', {
      inventoryId,
      reason,
      delta,
      tenantId: ctx.tenantId,
    })

    return {
      id: inventoryId,
      tenantId: ctx.tenantId,
      branchId: inventory.branch_id,
      productId: inventory.product_id,
      quantity: delta,
      reason: reason as AdjustmentReason,
      notes: notes ?? null,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    }
  }

  // -----------------------------------------------------------------------
  // Utility: Update branch inventory quantity (for sales/purchases)
  // -----------------------------------------------------------------------

  async adjustBranchInventory(
    productId: string,
    branchId: string,
    delta: number,
    ctx: InventoryContext,
    movementType: string,
    referenceType?: string,
    referenceId?: string,
    notes?: string,
    userId?: string,
  ): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const inventory = await tx.branchInventory.findFirst({
        where: {
          tenant_id: ctx.tenantId,
          branch_id: branchId,
          product_id: productId,
          deleted_at: null,
        },
      })

      if (inventory) {
        await tx.branchInventory.update({
          where: { id: inventory.id },
          data: {
            quantity_on_hand: { increment: delta },
            updated_at: new Date(),
          },
        })
      } else if (delta > 0) {
        // Create inventory if it doesn't exist and we're adding stock
        await tx.branchInventory.create({
          data: {
            tenant_id: ctx.tenantId,
            branch_id: branchId,
            product_id: productId,
            quantity_on_hand: delta,
            reserved_quantity: 0,
          },
        })
      }

      // Also create ledger entry
      await tx.inventoryLedger.create({
        data: {
          tenant_id: ctx.tenantId,
          branch_id: branchId,
          product_id: productId,
          movement_type: movementType as any,
          quantity_delta: delta,
          reference_type: referenceType,
          reference_id: referenceId,
          notes,
          created_by: userId,
        },
      })
    })
  }

  // =======================================================================
  // INVENTORY UPDATE REQUESTS
  // =======================================================================

  async createInventoryUpdateRequest(data: CreateInventoryUpdateRequest, ctx: InventoryContext): Promise<InventoryUpdateRequest> {
    const branchId = ctx.branchId
    if (!branchId) {
      throw new NotFoundError('Branch')
    }

    const inventory = await this.db.branchInventory.findFirst({
      where: this.buildScopeWhere(ctx, { product_id: data.productId }),
    })

    if (!inventory) {
      throw new NotFoundError('BranchInventory')
    }

    return this.db.inventoryUpdateRequest.create({
      data: {
        tenant_id: ctx.tenantId,
        branch_id: branchId,
        product_id: data.productId,
        requested_by: ctx.userId,
        previous_quantity: inventory.quantity_on_hand,
        requested_quantity: data.requestedQuantity,
        notes: data.notes ?? null,
        status: 'PENDING',
      },
    })
  }

  async findInventoryUpdateRequest(id: string, ctx: InventoryContext): Promise<InventoryUpdateRequest | null> {
    return this.db.inventoryUpdateRequest.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
    })
  }

  async findManyInventoryUpdateRequests(
    query: InventoryUpdateRequestListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: InventoryUpdateRequest[]; total: number }> {
    const where = this.buildScopeWhere(ctx)

    if (query.status) {
      ;(where as Record<string, unknown>).status = query.status as InventoryUpdateRequestStatus
    }
    if (query.productId) {
      ;(where as Record<string, unknown>).product_id = query.productId
    }
    if (query.search) {
      ;(where as Record<string, unknown>).OR = [
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
        { product: { sku: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [total, data] = await this.db.$transaction([
      this.db.inventoryUpdateRequest.count({ where }),
      this.db.inventoryUpdateRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
          branch: { select: { name: true } },
        },
      }),
    ])

    return { data, total }
  }

  async approveInventoryUpdateRequest(id: string, ctx: InventoryContext, approvedQuantity: number, notes?: string | null): Promise<InventoryUpdateRequest> {
    const existing = await this.findInventoryUpdateRequest(id, ctx)
    if (!existing) {
      throw new NotFoundError('InventoryUpdateRequest')
    }
    if (existing.status !== 'PENDING') {
      throw new NotFoundError('InventoryUpdateRequest')
    }

    const branchId = existing.branch_id
    const productId = existing.product_id
    const delta = approvedQuantity - existing.previous_quantity

    const branchInventory = await this.db.branchInventory.findFirst({
      where: this.buildScopeWhere({ tenantId: ctx.tenantId, branchId, userId: ctx.userId }, { product_id: productId }),
    })

    if (!branchInventory) {
      throw new NotFoundError('BranchInventory')
    }

    await this.db.$transaction(async (tx: any) => {
      // Update branch inventory
      await tx.branchInventory.update({
        where: { id: branchInventory.id },
        data: {
          quantity_on_hand: approvedQuantity,
          reserved_quantity: 0,
          last_counted_at: new Date(),
          updated_at: new Date(),
        },
      })

      // Create ledger entry
      await tx.inventoryLedger.create({
        data: {
          tenant_id: ctx.tenantId,
          branch_id: branchId,
          product_id: productId,
          movement_type: 'ADJUSTMENT',
          quantity_delta: delta,
          reference_type: 'INVENTORY_UPDATE_REQUEST',
          reference_id: id,
          notes: notes ?? existing.notes,
          created_by: ctx.userId,
        },
      })

      // Update request status
      await tx.inventoryUpdateRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by: ctx.userId,
          approved_quantity: approvedQuantity,
          reviewed_at: new Date(),
          notes: notes ?? existing.notes,
        },
      })
    })

    return this.findInventoryUpdateRequest(id, ctx) as Promise<InventoryUpdateRequest>
  }

  async rejectInventoryUpdateRequest(id: string, ctx: InventoryContext, notes?: string | null): Promise<InventoryUpdateRequest> {
    const existing = await this.findInventoryUpdateRequest(id, ctx)
    if (!existing) {
      throw new NotFoundError('InventoryUpdateRequest')
    }
    if (existing.status !== 'PENDING') {
      throw new NotFoundError('InventoryUpdateRequest')
    }

    await this.db.inventoryUpdateRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: ctx.userId,
        reviewed_at: new Date(),
        notes: notes ?? existing.notes,
      },
    })

    return this.findInventoryUpdateRequest(id, ctx) as Promise<InventoryUpdateRequest>
  }
}

/**
 * Singleton instance exported for the service layer.
 */
export const inventoryRepository = new InventoryRepository()
