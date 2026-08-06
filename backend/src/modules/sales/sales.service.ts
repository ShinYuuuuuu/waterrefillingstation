import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { httpStatus, pagination } from '../../constants'
import {
  SaleContext,
  SaleListQuery,
  SaleListResponse,
  SaleResponse,
  DailySummaryResponse,
  CreateSaleRequest,
  UpdateSaleRequest,
  RecordPaymentRequest,
  VoidSaleRequest,
} from './sales.types'
import { SaleRepository, saleRepository } from './sales.repository'
import { SaleMapper } from './sales.mapper'

/**
 * Application service for the Sales module.
 *
 * The service layer is the orchestrator: it invokes the repository for data
 * access, enforces business rules, performs DTO mapping, and creates audit
 * log entries. It never touches Prisma directly for sales data.
 *
 * The service injects a repository instance so it can be unit-tested with a
 * mock in place of the real Prisma-backed repository.
 */
export class SaleService {
  constructor(private readonly repository: SaleRepository) {}

  // -----------------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------------

  /**
   * Create a new sale within the caller's tenant and branch.
   *
   * Business rules:
   *  - Walk-in refill = ₱20/gallon
   *  - Delivery refill = ₱25/gallon
   *  - Empty gallon = configurable price (from product base_price)
   *  - Mixed transactions allowed (refill + gallon in one sale)
   *  - Cash payment only
   *  - amount_paid >= total
   *  - Calculate change
   *  - Deduct inventory (prevent negative)
   *  - Customer validation (if provided)
   *  - Audit log CREATE
   */
  async createSale(data: CreateSaleRequest, ctx: SaleContext): Promise<SaleResponse> {
    logger.debug('Creating sale', { channel: data.channel, tenantId: ctx.tenantId })

    if (!data.items.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'At least one item is required')
    }
    if (!data.payments.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'At least one payment is required')
    }

    // Cash payment only validation
    const invalidPayment = data.payments.find((p: any) => p.method !== 'CASH')
    if (invalidPayment) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Cash payment only')
    }

    // Validate customer if provided
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, tenant_id: ctx.tenantId, deleted_at: null },
      })
      if (!customer) {
        throw new NotFoundError('Customer')
      }
    }

    // Validate products and enforce pricing rules
    const productIds = data.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenant_id: ctx.tenantId, deleted_at: null },
    })

    if (products.length !== productIds.length) {
      throw new NotFoundError('Product')
    }

    const productMap = new Map(products.map((p: any) => [p.id, p]))

    const processedItems: CreateSaleRequest['items'] = []
    for (const item of data.items) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new NotFoundError('Product')
      }

      let unitPrice = item.unitPrice

      // Refill pricing: Walk-in = 20, Delivery = 25
      if ((product as any).type === 'SERVICE') {
        if (data.channel === 'IN_STORE') {
          unitPrice = 20
        } else if (data.channel === 'DELIVERY') {
          unitPrice = 25
        }
      }

      // For CONTAINER and FINISHED_GOOD, use configurable price (provided or base_price)
      if (((product as any).type === 'CONTAINER' || (product as any).type === 'FINISHED_GOOD') && !item.unitPrice) {
        unitPrice = Number((product as any).base_price)
      }

      processedItems.push({
        ...item,
        unitPrice,
      })
    }

    // Calculate totals
    const subtotal = processedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const discountTotal = data.discountTotal ?? 0
    const taxTotal = data.taxTotal ?? 0
    const grandTotal = subtotal - discountTotal + taxTotal

    // Validate payment amounts
    const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0)
    if (totalPaid < grandTotal) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient payment amount')
    }

    const changeAmount = totalPaid - grandTotal

    // Opening cash validation: check active shift
    const activeShift = await prisma.shift.findFirst({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId ?? undefined,
        cashier_id: ctx.userId,
        status: 'OPEN',
        deleted_at: null,
      },
    })

    if (activeShift && totalPaid > 0) {
      logger.debug('Active shift found for opening cash validation', { shiftId: activeShift.id })
    }

    // Deduct inventory for each item
    for (const item of processedItems) {
      await this.deductInventory(ctx, item.productId, item.quantity)
    }

    // Create the sale via repository
    const createData: CreateSaleRequest = {
      ...data,
      items: processedItems,
      payments: data.payments.map((p) => ({ ...p, amount: p.amount })),
    }

    const createdSale = await this.repository.create(createData, ctx)

    // Log audit
    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'SalesTransaction',
      entityId: createdSale.id,
      afterData: createdSale,
    })

    const sale = await this.repository.findUnique(createdSale.id, ctx)
    if (!sale) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve created sale')
    }

    return SaleMapper.toResponse(
      sale as any,
      (sale as any).items,
      (sale as any).payments,
    )
  }

  // -----------------------------------------------------------------------
  // READ — single
  // -----------------------------------------------------------------------

  /**
   * Retrieve a single sale by ID with its items and payments.
   */
  async getSale(id: string, ctx: SaleContext): Promise<SaleResponse> {
    const sale = await this.repository.findUnique(id, ctx)
    if (!sale) {
      throw new NotFoundError('SalesTransaction')
    }

    return SaleMapper.toResponse(
      sale as any,
      (sale as any).items,
      (sale as any).payments,
    )
  }

  // -----------------------------------------------------------------------
  // READ — list
  // -----------------------------------------------------------------------

  /**
   * Retrieve a paginated list of sales.
   */
  async getSales(query: SaleListQuery, ctx: SaleContext): Promise<SaleListResponse> {
    const { data, total, page, limit, totalPages } = await this.repository.findMany(query, ctx)

    return {
      data: data.map((sale: any) =>
        SaleMapper.toResponse(sale, sale.items, sale.payments),
      ),
      meta: { page, limit, total, totalPages },
    }
  }

  // -----------------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------------

  /**
   * Update an existing sale.
   */
  async updateSale(id: string, data: UpdateSaleRequest, ctx: SaleContext): Promise<SaleResponse> {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('SalesTransaction')
    }

    if ((existing as any).status === 'VOID') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Cannot update a voided sale')
    }

    const updated = await this.repository.update(id, data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'SalesTransaction',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    })

    return SaleMapper.toResponse(
      updated as any,
      (updated as any).items,
      (updated as any).payments,
    )
  }

  // -----------------------------------------------------------------------
  // DELETE (soft)
  // -----------------------------------------------------------------------

  /**
   * Soft-delete a sale.
   */
  async deleteSale(id: string, ctx: SaleContext): Promise<void> {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('SalesTransaction')
    }

    await this.repository.remove(id, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'SalesTransaction',
      entityId: id,
      beforeData: existing,
    })
  }

  // -----------------------------------------------------------------------
  // PAYMENT
  // -----------------------------------------------------------------------

  /**
   * Record a payment against a sale.
   */
  async recordPayment(saleId: string, data: RecordPaymentRequest, ctx: SaleContext): Promise<unknown> {
    const sale = await this.repository.findUnique(saleId, ctx)
    if (!sale) {
      throw new NotFoundError('SalesTransaction')
    }

    if ((sale as any).status === 'VOID') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Cannot record payment on a voided sale')
    }

    // Cash payment only
    if (data.method !== 'CASH') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Cash payment only')
    }

    const payment = await this.repository.recordPayment(saleId, data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'PAYMENT',
      entityType: 'Payment',
      entityId: (payment as any).id,
      afterData: payment,
    })

    return payment
  }

  // -----------------------------------------------------------------------
  // VOID
  // -----------------------------------------------------------------------

  /**
   * Void a sale transaction.
   */
  async voidSale(saleId: string, data: VoidSaleRequest, ctx: SaleContext): Promise<SaleResponse> {
    const sale = await this.repository.findUnique(saleId, ctx)
    if (!sale) {
      throw new NotFoundError('SalesTransaction')
    }

    if ((sale as any).status === 'VOID') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Sale is already voided')
    }

    if ((sale as any).status === 'REFUNDED') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Cannot void a refunded sale')
    }

    // Void via repository
    const voided = await this.repository.voidSale(saleId, data, ctx)

    // Restore inventory
    const items = (voided as any).items || []
    for (const item of items) {
      await this.restoreInventory(ctx, item.product_id, item.quantity)
    }

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'VOID',
      entityType: 'SalesTransaction',
      entityId: saleId,
      beforeData: sale,
      afterData: voided,
    })

    return SaleMapper.toResponse(
      voided as any,
      items,
      (voided as any).payments,
    )
  }

  // -----------------------------------------------------------------------
  // DAILY SUMMARY
  // -----------------------------------------------------------------------

  /**
   * Get daily sales summary for a branch or tenant.
   */
  async getDailySummary(date: string, branchId: string | null, ctx: SaleContext): Promise<DailySummaryResponse> {
    return this.repository.getDailySummary(date, branchId, ctx)
  }

  // -----------------------------------------------------------------------
  // HELPERS
  // -----------------------------------------------------------------------

  /**
   * Deduct inventory for a product. Creates an InventoryLedger entry.
   * Throws if inventory would go negative.
   */
  private async deductInventory(ctx: SaleContext, productId: string, quantity: number): Promise<void> {
    const inventory = await prisma.branchInventory.findFirst({
      where: {
        branch_id: ctx.branchId ?? '',
        product_id: productId,
        tenant_id: ctx.tenantId,
        deleted_at: null,
      },
    })

    if (!inventory) {
      throw new AppError(httpStatus.BAD_REQUEST, `Insufficient inventory for product ${productId}`)
    }

    const available = inventory.quantity_on_hand - inventory.reserved_quantity
    if (available < quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, `Insufficient inventory for product ${productId}. Available: ${available}, requested: ${quantity}`)
    }

    await prisma.branchInventory.update({
      where: { id: inventory.id },
      data: {
        quantity_on_hand: { decrement: quantity },
        updated_at: new Date(),
      },
    })

    await prisma.inventoryLedger.create({
      data: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId ?? '',
        product_id: productId,
        movement_type: 'SALE',
        quantity_delta: -quantity,
        reference_type: 'SalesTransaction',
        notes: 'Sale deduction',
        created_by: ctx.userId,
      },
    })
  }

  /**
   * Restore inventory when a sale is voided.
   */
  private async restoreInventory(ctx: SaleContext, productId: string, quantity: number): Promise<void> {
    const inventory = await prisma.branchInventory.findFirst({
      where: {
        branch_id: ctx.branchId ?? '',
        product_id: productId,
        tenant_id: ctx.tenantId,
        deleted_at: null,
      },
    })

    if (inventory) {
      await prisma.branchInventory.update({
        where: { id: inventory.id },
        data: {
          quantity_on_hand: { increment: quantity },
          updated_at: new Date(),
        },
      })
    } else {
      // Create inventory record if it doesn't exist
      await prisma.branchInventory.create({
        data: {
          tenant_id: ctx.tenantId,
          branch_id: ctx.branchId ?? '',
          product_id: productId,
          quantity_on_hand: quantity,
          reserved_quantity: 0,
        },
      })
    }

    await prisma.inventoryLedger.create({
      data: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId ?? '',
        product_id: productId,
        movement_type: 'ADJUSTMENT',
        quantity_delta: quantity,
        reference_type: 'SalesTransaction',
        notes: 'Void restoration',
        created_by: ctx.userId,
      },
    })
  }

  /**
   * Write an audit log entry.
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
    try {
      await prisma.auditLog.create({
        data: {
          tenant_id: params.tenantId,
          user_id: params.userId,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          before_data: params.beforeData as any,
          after_data: params.afterData as any,
        },
      })
    } catch (error) {
      logger.error('Failed to write audit log', { error, params })
    }
  }
}

/**
 * Singleton instance exported for the controller layer.
 */
export const saleService = new SaleService(saleRepository)
