import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { httpStatus, pagination } from '../../constants'
import {
  BranchInventory,
  BranchInventoryListQuery,
  BranchInventoryListResponse,
  BranchInventoryResponse,
  InventoryContext,
  InventoryLedger,
  InventoryLedgerListQuery,
  InventoryLedgerResponse,
  InventoryAdjustmentResponse,
  InventoryAdjustmentListQuery,
  CreateBranchInventoryRequest,
  UpdateBranchInventoryRequest,
  CreateInventoryAdjustmentRequest,
  ProductionBatch,
  ProductionBatchResponse,
  ProductionBatchDetailsResponse,
  ProductionBatchListQuery,
  CreateProductionBatchRequest,
  StockTransfer,
  StockTransferListQuery,
  StockTransferListResponse,
  StockTransferResponse,
  CreateStockTransferRequest,
  StockTransferStatus,
  StockCountSession,
  StockCountSessionResponse,
  StockCountItem,
  CreateStockCountRequest,
  StockTransferItem,
  AdjustmentReason,
  LowStockAlertResponse,
} from './inventory.types'
import { InventoryMapper } from './inventory.mapper'
import { InventoryRepository, inventoryRepository } from './inventory.repository'
import { Product } from '../product/product.types'

/**
 * Application service for the Inventory Management module.
 *
 * The service is the orchestrator: it invokes the repository for data
 * access, enforces business rules, performs DTO mapping, writes audit log
 * entries (via the cross-cutting `prisma.auditLog` like other services),
 * and coordinates multi-step transactions.
 *
 * The service injects a repository instance so it can be unit-tested with
 * a mock in place of the real Prisma-backed repository.
 */
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  // =======================================================================
  // BRANCH INVENTORY CRUD
  // =======================================================================

  /**
   * List branch inventory with pagination, filtering, and search.
   *
   * Business rules:
   *  - Tenant isolation: results are scoped to the caller's tenant.
   *  - Branch isolation: branch-scoped users see only their branch;
   *    HQ/Owner users (branchId === null) may pass an explicit `branchId`
   *    query param to view a specific branch.
   *  - Soft deletes: deleted records are excluded.
   */
  async listBranchInventory(
    query: BranchInventoryListQuery,
    ctx: InventoryContext,
  ): Promise<BranchInventoryListResponse> {
    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)

    const { data, total } = await this.repository.findManyBranchInventory(
      { ...query, page, limit },
      ctx,
    )

     // Post-filter for lowStock: available_quantity (qoh - reserved) <= reorder_level
     let filteredData = data
     if (query.lowStock) {
       filteredData = data.filter((item) => {
         const available = item.quantity_on_hand - item.reserved_quantity
         const reorderLevel = item.product?.reorder_level ?? 0
         return available <= reorderLevel
       })
     }

     const resultTotal = query.lowStock ? filteredData.length : total
     return {
       data: filteredData.map((item) => InventoryMapper.toBranchInventoryResponse(item as BranchInventory & { product?: Product })),
       meta: {
         page,
         limit,
         total: resultTotal,
         totalPages: Math.ceil(resultTotal / limit),
       },
     }
  }

  /**
   * Get a single branch inventory entry by ID.
   */
  async getBranchInventory(id: string, ctx: InventoryContext): Promise<BranchInventoryResponse> {
    const entity = await this.repository.findBranchInventoryById(id, ctx)
    if (!entity) {
      throw new NotFoundError('BranchInventory')
    }
    return InventoryMapper.toBranchInventoryResponse(entity as BranchInventory & { product?: Product })
  }

  /**
   * Create branch inventory for a product.
   *
   * Business rules:
   *  - For new products without an existing branch inventory record, a new
   *    record is created via upsert.
   *  - An audit log entry is created.
   */
  async createBranchInventory(
    data: CreateBranchInventoryRequest,
    ctx: InventoryContext,
  ): Promise<BranchInventoryResponse> {
    logger.debug('Creating branch inventory', { productId: data.productId, tenantId: ctx.tenantId })

    // Validate product exists in tenant
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!product) {
      throw new NotFoundError('Product')
    }

    const created = await this.repository.createBranchInventory(data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'BranchInventory',
      entityId: created.id,
      afterData: created,
    })

    return InventoryMapper.toBranchInventoryResponse(created as BranchInventory & { product?: Product })
  }

  /**
   * Update an existing branch inventory record.
   */
  async updateBranchInventory(
    id: string,
    data: UpdateBranchInventoryRequest,
    ctx: InventoryContext,
  ): Promise<BranchInventoryResponse> {
    const existing = await this.repository.findBranchInventoryById(id, ctx)
    if (!existing) {
      throw new NotFoundError('BranchInventory')
    }

    const updated = await this.repository.updateBranchInventory(id, data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'BranchInventory',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    })

    return InventoryMapper.toBranchInventoryResponse(updated as BranchInventory & { product?: Product })
  }

  /**
   * Soft-delete a branch inventory record.
   */
  async deleteBranchInventory(id: string, ctx: InventoryContext): Promise<void> {
    const existing = await this.repository.findBranchInventoryById(id, ctx)
    if (!existing) {
      throw new NotFoundError('BranchInventory')
    }

    await this.repository.removeBranchInventory(id, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'BranchInventory',
      entityId: id,
      beforeData: existing,
    })

    logger.info('Branch inventory soft-deleted', { id, tenantId: ctx.tenantId })
  }

  // =======================================================================
  // LOW STOCK ALERTS
  // =======================================================================

  /**
   * Returns all branch inventory items where available_quantity <= reorder_level.
   *
   * Business rule: triggers when available_quantity <= reorder_level.
   * available_quantity = quantity_on_hand - reserved_quantity.
   */
  async getLowStockAlerts(ctx: InventoryContext, branchId?: string): Promise<LowStockAlertResponse[]> {
    const alerts = await this.repository.findLowStockAlerts(ctx, branchId)

    // Enrich with product name from fetched data (already included via include)
    return alerts.map((inv) =>
      InventoryMapper.toLowStockAlertResponse(
        inv as BranchInventory & { product?: { name: string; reorder_level: number; sku: string }; branch?: { name: string } },
      ),
    )
  }

  // =======================================================================
  // INVENTORY LEDGER
  // =======================================================================

  async listLedgerEntries(
    query: InventoryLedgerListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: InventoryLedgerResponse[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)

    const { data, total } = await this.repository.findManyLedger(
      { ...query, page, limit },
      ctx,
    )

    return {
      data: data.map(InventoryMapper.toLedgerResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getLedgerEntry(id: string, ctx: InventoryContext): Promise<InventoryLedgerResponse> {
    const entry = await prisma.inventoryLedger.findFirst({
      where: {
        id,
        tenant_id: ctx.tenantId,
        deleted_at: null,
        ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      },
    })
    if (!entry) {
      throw new NotFoundError('InventoryLedger')
    }
    return InventoryMapper.toLedgerResponse(entry as InventoryLedger)
  }

  // =======================================================================
  // PRODUCTION BATCH
  // =======================================================================

  /**
   * List production batches with pagination, filtering, and search.
   */
  async listProductionBatches(
    query: ProductionBatchListQuery,
    ctx: InventoryContext,
  ): Promise<{ data: ProductionBatchResponse[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)

    const { data, total } = await this.repository.findManyProductionBatches(
      { ...query, page, limit },
      ctx,
    )

    return {
      data: data.map(InventoryMapper.toProductionBatchResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get production batch details including ledger entries.
   */
  async getProductionBatch(id: string, ctx: InventoryContext): Promise<ProductionBatchDetailsResponse> {
    const batch = await this.repository.findProductionBatchById(id, ctx)
    if (!batch) {
      throw new NotFoundError('ProductionBatch')
    }

    // Fetch ledger entries for this batch
    const ledgerEntries = await prisma.inventoryLedger.findMany({
      where: {
        tenant_id: ctx.tenantId,
        reference_type: 'ProductionBatch',
        reference_id: id,
        deleted_at: null,
      },
    })

    return InventoryMapper.toProductionBatchDetailsResponse(batch as ProductionBatch, ledgerEntries)
  }

  /**
   * Create a new production batch.
   *
   * Business rules:
   *  - Branch context is required.
   *  - Batch number must be unique within the tenant.
   *  - Output product must exist within the tenant.
   *  - A ledger entry is created for the production movement.
   *  - An audit log entry is created.
   */
  async createProductionBatch(
    data: CreateProductionBatchRequest,
    ctx: InventoryContext,
  ): Promise<ProductionBatchResponse> {
    if (!ctx.branchId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to create a production batch')
    }

    // Validate output product exists in tenant
    const product = await prisma.product.findFirst({
      where: { id: data.outputProductId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!product) {
      throw new NotFoundError('Product')
    }

    const created = await this.repository.createProductionBatch(data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'ProductionBatch',
      entityId: created.id,
      afterData: created,
    })

    return InventoryMapper.toProductionBatchResponse(created as ProductionBatch)
  }

  /**
   * Complete a production batch (marks completion timestamp).
   */
  async completeProductionBatch(id: string, ctx: InventoryContext): Promise<ProductionBatchResponse> {
    const batch = await this.repository.findProductionBatchById(id, ctx)
    if (!batch) {
      throw new NotFoundError('ProductionBatch')
    }

    const updated = await this.repository.completeProductionBatch(id, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'ProductionBatch',
      entityId: id,
      afterData: updated,
    })

    return InventoryMapper.toProductionBatchResponse(updated as ProductionBatch)
  }

  // =======================================================================
  // STOCK TRANSFER
  // =======================================================================

  /**
   * List stock transfers with pagination and filtering.
   *
   * Business rules:
   *  - Branch-scoped users see only transfers involving their branch
   *    (as origin or destination).
   *  - HQ/Owner users see all transfers in the tenant.
   */
  async listStockTransfers(
    query: StockTransferListQuery,
    ctx: InventoryContext,
  ): Promise<StockTransferListResponse> {
    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)

    const { data, total } = await this.repository.findManyStockTransfers(
      { ...query, page, limit },
      ctx,
    )

    return {
      data: data.map((t) =>
        InventoryMapper.toStockTransferResponse(
          t as unknown as StockTransfer,
          (t as unknown as { items: StockTransferItem[] }).items,
        ),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get a single stock transfer with its items.
   */
  async getStockTransfer(id: string, ctx: InventoryContext): Promise<StockTransferResponse> {
    const transfer = await this.repository.findStockTransferById(id, ctx)
    if (!transfer) {
      throw new NotFoundError('StockTransfer')
    }
    return InventoryMapper.toStockTransferResponse(transfer, transfer.items)
  }

  /**
   * Create a new stock transfer (status = PENDING).
   *
   * Business rules:
   *  - Branch context is required (origin branch = caller's branch).
   *  - Destination branch must exist in the same tenant.
   *  - Origin and destination must be different branches.
   *  - Each transfer item's product must exist in the tenant.
   *  - Sufficient stock must exist at the origin branch.
   *  - Stock is NOT moved until the transfer reaches IN_TRANSIT status.
   *  - An audit log entry is created.
   */
  async createStockTransfer(data: CreateStockTransferRequest, ctx: InventoryContext): Promise<StockTransferResponse> {
    if (!ctx.branchId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to create a stock transfer')
    }

    const created = await this.repository.createStockTransfer(data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'StockTransfer',
      entityId: created.id,
      afterData: created,
    })

     return InventoryMapper.toStockTransferResponse(
      created as unknown as StockTransfer,
      (created as unknown as { items: StockTransferItem[] }).items,
    )
  }

  /**
   * Update the status of a stock transfer.   *
   * Workflow: Draft → Submitted → Approved → In Transit → Received → Cancelled
   * The schema enum PENDING maps to "Draft/Submitted" and APPROVED to "Approved".
   *
   * Business rules:
   *  - Transition must be valid per STOCK_TRANSFER_TRANSITIONS.
   *  - When transitioning to IN_TRANSIT: stock is deducted from origin
   *    and a TRANSFER_OUT ledger entry is created.
   *  - When transitioning to RECEIVED: stock is added to destination
   *    and a TRANSFER_IN ledger entry is created.
   *  - Cancelled transfers do not move stock.
   *  - Terminal statuses (RECEIVED, DISCREPANCY, CANCELLED) cannot be left.
   */
  async updateStockTransferStatus(
    id: string,
    status: StockTransferStatus,
    notes: string | null,
    ctx: InventoryContext,
  ): Promise<StockTransferResponse> {
    const existing = await this.repository.findStockTransferById(id, ctx)
    if (!existing) {
      throw new NotFoundError('StockTransfer')
    }

    const updated = await this.repository.updateStockTransferStatus(id, status, ctx, notes ?? undefined)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'StockTransfer',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    })

    return InventoryMapper.toStockTransferResponse(
      updated as unknown as StockTransfer,
      (updated as unknown as { items: StockTransferItem[] }).items,
    )
  }

  // =======================================================================
  // STOCK COUNT
  // =======================================================================

  /**
   * Create a new stock count session (status = OPEN).
   *
   * Business rules:
   *  - Branch context is required.
   *  - Only one open session per branch at a time.
   */
  async createStockCountSession(ctx: InventoryContext, notes?: string | null): Promise<StockCountSessionResponse> {
    if (!ctx.branchId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to create a stock count session')
    }

    // Check for existing open session
    const openSession = await prisma.stockCountSession.findFirst({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId,
        status: 'OPEN',
        deleted_at: null,
      },
    })
    if (openSession) {
      throw new AppError(httpStatus.CONFLICT, 'A stock count session is already open for this branch')
    }

    const session = await this.repository.createStockCountSession(ctx, notes)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'StockCountSession',
      entityId: session.id,
      afterData: session,
    })

    // Return with empty items and proper mapping
    const response = this.mapStockCountSession(session, [])
    return response
  }

  /**
   * Record counts for a stock count session.
   * Creates stock count items with book_quantity (from branch inventory),
   * counted_quantity, and calculated variance.
   */
  async recordStockCountItems(
    sessionId: string,
    data: CreateStockCountRequest,
    ctx: InventoryContext,
  ): Promise<StockCountSessionResponse> {
    const session = await this.repository.getStockCountSession(sessionId, ctx)
    if (!session) {
      throw new NotFoundError('StockCountSession')
    }

    if (session.status !== 'OPEN') {
      throw new AppError(httpStatus.CONFLICT, 'Stock count session must be in OPEN status to record items')
    }

    // Clear existing items and re-add (idempotent submission)
    await prisma.stockCountItem.deleteMany({
      where: { session_id: sessionId },
    })

    await this.repository.addStockCountItems(sessionId, data.items, ctx)

    // Re-fetch with items
    const updated = await this.repository.getStockCountSession(sessionId, ctx)
    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'StockCountSession',
      entityId: sessionId,
      afterData: updated,
    })

    return this.mapStockCountSession(updated!, updated!.items)
  }

  /**
   * Calculate variance for a stock count session.
   */
  async calculateStockCountVariance(sessionId: string, ctx: InventoryContext): Promise<StockCountSessionResponse> {
    const session = await this.repository.getStockCountSession(sessionId, ctx)
    if (!session) {
      throw new NotFoundError('StockCountSession')
    }

    const items = await this.repository.calculateStockCountVariance(sessionId, ctx)

    return this.mapStockCountSession(session, items)
  }

  /**
   * Submit a stock count session for approval (status: OPEN → SUBMITTED).
   */
  async submitStockCount(sessionId: string, ctx: InventoryContext): Promise<StockCountSessionResponse> {
    const session = await this.repository.getStockCountSession(sessionId, ctx)
    if (!session) {
      throw new NotFoundError('StockCountSession')
    }

    if (session.status !== 'OPEN') {
      throw new AppError(
        httpStatus.CONFLICT,
        `Stock count session must be in OPEN status to submit, current status: ${session.status}`,
      )
    }

    const updated = await this.repository.submitStockCount(sessionId, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'StockCountSession',
      entityId: sessionId,
      afterData: updated,
    })

    const withItems = await this.repository.getStockCountSession(sessionId, ctx)
    return this.mapStockCountSession(withItems!, withItems!.items)
  }

  /**
   * Approve a stock count session (status: SUBMITTED → APPROVED).
   * Posts inventory adjustments for all items with non-zero variance.
   */
  async approveStockCount(sessionId: string, ctx: InventoryContext): Promise<StockCountSessionResponse> {
    const session = await this.repository.getStockCountSession(sessionId, ctx)
    if (!session) {
      throw new NotFoundError('StockCountSession')
    }

    if (session.status !== 'SUBMITTED') {
      throw new AppError(
        httpStatus.CONFLICT,
        `Stock count session must be in SUBMITTED status to approve, current status: ${session.status}`,
      )
    }

    const updated = await this.repository.approveStockCount(sessionId, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'StockCountSession',
      entityId: sessionId,
      afterData: updated,
    })

    const withItems = await this.repository.getStockCountSession(sessionId, ctx)
    return this.mapStockCountSession(withItems!, withItems!.items)
  }

  // =======================================================================
  // INVENTORY ADJUSTMENT
  // =======================================================================

  /**
   * Get a stock count session with its items.
   */
  async getStockCountSession(sessionId: string, ctx: InventoryContext): Promise<StockCountSessionResponse> {
    const session = await this.repository.getStockCountSession(sessionId, ctx)
    if (!session) {
      throw new NotFoundError('StockCountSession')
    }
    return this.mapStockCountSession(session, session.items)
  }

  /**
   * Create an inventory adjustment.
   *
   * Business rules:
   *  - Reason must be one of: DAMAGE, EXPIRED, LOST, MANUAL, OPENING_BALANCE.
   *  - POSITIVE adjustments (OPENING_BALANCE, MANUAL): quantity is added.
   *  - NEGATIVE adjustments (DAMAGE, EXPIRED, LOST): quantity is removed.
   *  - PREVENT negative inventory: if the adjustment would make
   *    quantity_on_hand negative, a 409 Conflict error is thrown.
   *  - Every adjustment creates a ledger entry with movement_type = ADJUSTMENT.
   *  - An audit log entry is created.
   */
  async createAdjustment(
    data: CreateInventoryAdjustmentRequest,
    ctx: InventoryContext,
  ): Promise<InventoryAdjustmentResponse> {
    if (!ctx.branchId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to create an inventory adjustment')
    }

    // Validate product exists in tenant
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!product) {
      throw new NotFoundError('Product')
    }

    // Find or create branch inventory for this product
    let inventory = await prisma.branchInventory.findFirst({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId,
        product_id: data.productId,
        deleted_at: null,
      },
    })

    if (!inventory) {
      // If adjustment is positive, create the inventory record
      const positiveReasons: AdjustmentReason[] = ['OPENING_BALANCE', 'MANUAL']
      if (positiveReasons.includes(data.reason)) {
        inventory = await prisma.branchInventory.create({
          data: {
            tenant_id: ctx.tenantId,
            branch_id: ctx.branchId,
            product_id: data.productId,
            quantity_on_hand: 0,
            reserved_quantity: 0,
          },
        })
      } else {
        throw new AppError(
          httpStatus.NOT_FOUND,
          'No branch inventory record found for this product. Create one first.',
        )
      }
    }

    const result = await this.repository.createAdjustmentEntry({
      inventoryId: inventory.id,
      quantity: Number(data.quantity),
      reason: data.reason,
      notes: data.notes ?? null,
      userId: ctx.userId,
      ctx,
    })

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'InventoryAdjustment',
      entityId: inventory.id,
      afterData: result,
    })

    return result
  }

  /**
   * List inventory adjustment history.
   */
  async listAdjustments(query: InventoryAdjustmentListQuery, ctx: InventoryContext): Promise<InventoryAdjustmentResponse[]> {
    // Fetch from ledger where movement_type = ADJUSTMENT
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      movement_type: 'ADJUSTMENT',
      deleted_at: null,
    }
    if (ctx.branchId) {
      where.branch_id = ctx.branchId
    }
    if (query.productId) {
      where.product_id = query.productId
    }
    if (query.reason) {
      // Reason is stored in the notes field as `Adjustment (REASON)`
      where.notes = { contains: `(${query.reason})` }
    }

    const entries = await prisma.inventoryLedger.findMany({
      where,
      take: query.limit ?? pagination.DEFAULT_LIMIT,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? pagination.DEFAULT_LIMIT),
      orderBy: { created_at: 'desc' },
      include: { product: { select: { name: true, sku: true } } },
    })

    return entries.map((entry: {
      id: string
      tenant_id: string
      branch_id: string
      product_id: string
      quantity_delta: number
      notes: string | null
      created_at: Date
      created_by: string | null
    }) => ({
      id: entry.id,
      tenantId: entry.tenant_id,
      branchId: entry.branch_id,
      productId: entry.product_id,
      quantity: entry.quantity_delta,
      reason: (entry.notes?.match(/\((DAMAGE|EXPIRED|LOST|MANUAL|OPENING_BALANCE)\)/)?.[1] || 'MANUAL') as AdjustmentReason,
      notes: entry.notes,
      createdAt: entry.created_at.toISOString(),
      createdBy: entry.created_by,
    }))
  }

  // =======================================================================
  // Helpers
  // =======================================================================

  /**
   * Map a stock count session entity to its response DTO.
   */
  private mapStockCountSession(
    session: StockCountSession,
    items: unknown[],
  ): StockCountSessionResponse {
    const typedItems = (items || []) as unknown as (StockCountItem & {
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
    })[]

    return {
      id: session.id,
      tenantId: session.tenant_id,
      branchId: session.branch_id,
      status: session.status,
      initiatedBy: session.initiated_by,
      approvedBy: session.approved_by,
      notes: session.notes,
      createdAt: session.created_at.toISOString(),
      submittedAt: session.submitted_at?.toISOString() ?? null,
      approvedAt: session.approved_at?.toISOString() ?? null,
      items: typedItems.map((item) => ({
        id: item.id,
        productId: item.product_id,
        bookQuantity: item.book_quantity,
        countedQuantity: item.counted_quantity,
        variance: item.variance,
        varianceAmount: item.variance_amount != null ? Number(item.variance_amount) : null,
        notes: item.notes,
        adjustmentApproved: item.adjustment_approved,
        approvedBy: item.approved_by,
        createdAt: item.created_at.toISOString(),
      })),
    }
  }

  // =======================================================================
  // Audit logging
  // =======================================================================

  /**
   * Persist an AuditLog entry.  Uses `prisma` directly (same pattern as
   * AuthService and other modules) because audit logging is a cross-cutting
   * concern not owned by the Inventory repository.
   */
  private async logAudit(params: {
    tenantId: string
    userId: string
    action: string
    entityType: string
    entityId: string
    beforeData?: unknown
    afterData?: unknown
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        before_data: params.beforeData ? { data: this.deepClone(params.beforeData) } : undefined,
        after_data: params.afterData ? { data: this.deepClone(params.afterData) } : undefined,
      },
    })
  }

  /** Deep-clone a value so mutable references are not shared with callers. */
  private deepClone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value))
  }
}

/**
 * Singleton instance exported for the controller layer.
 * Uses the repository singleton by default; inject a mock for testing.
 */
export const inventoryService = new InventoryService(inventoryRepository)
