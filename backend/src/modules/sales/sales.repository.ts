import { prisma } from '../../database'
import { NotFoundError } from '../../middleware/errorHandler'
import { pagination } from '../../constants'
import {
  SaleContext,
  SaleListQuery,
  CreateSaleRequest,
  CreateSaleItemRequest,
  UpdateSaleRequest,
  RecordPaymentRequest,
  VoidSaleRequest,
} from './sales.types'

/**
 * Data-access layer for the Sales module.
 *
 * All queries are scoped by `tenant_id` (multi-tenant isolation) and
 * `branch_id` (branch isolation) at the database level. Soft deletes
 * (`deleted_at IS NULL`) are applied to every read query so that
 * historical data is preserved per AI_PROJECT_RULES.md §4.6.
 *
 * The repository is the only layer that touches Prisma; the service and
 * controller layers never import `prisma` directly (dependency inversion).
 */
export class SaleRepository {
  private readonly db = prisma

  /**
   * Build a WHERE clause fragment that enforces tenant and branch isolation
   * plus soft-delete exclusion. HQ/Owner users (branchId === null) are
   * scoped only by tenant, giving them a cross-branch view.
   */
  private buildScopeWhere(ctx: SaleContext, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      ...extra,
    }
  }

  // -----------------------------------------------------------------------
  // READ
  // -----------------------------------------------------------------------

  /**
   * Retrieve a paginated list of sales with optional filtering and sorting.
   */
  async findMany(query: SaleListQuery, ctx: SaleContext): Promise<{ data: never[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: Record<string, unknown> = this.buildScopeWhere(ctx)

    if (query.status) {
      where.status = query.status
    }
    if (query.channel) {
      where.channel = query.channel
    }
    if (query.customerId) {
      where.customer_id = query.customerId
    }
    if (query.productId) {
      where.items = { some: { product_id: query.productId, deleted_at: null } }
    }
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (query.startDate) dateFilter.gte = new Date(query.startDate)
      if (query.endDate) dateFilter.lte = new Date(query.endDate)
      where.created_at = dateFilter
    }
    if (query.search) {
      ;(where as Record<string, unknown>).OR = [
        { invoice_number: { contains: query.search, mode: 'insensitive' } },
        { customer: { full_name: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit
    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy: Record<string, string> = { [sortBy]: sortOrder }

    const [total, data] = await this.db.$transaction([
      this.db.salesTransaction.count({ where }),
      this.db.salesTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          items: { include: { product: { select: { name: true } } } },
          payments: true,
          customer: { select: { full_name: true, phone: true } },
          user: { select: { full_name: true } },
        },
      }),
    ])

    return {
      data: data as never[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Retrieve a single sale by primary key with items and payments.
   */
  async findUnique(id: string, ctx: SaleContext) {
    const sale = await this.db.salesTransaction.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
      include: {
        items: { include: { product: { select: { name: true } } } },
        payments: true,
        customer: { select: { full_name: true, phone: true, email: true } },
        user: { select: { full_name: true } },
      },
    })

    return sale
  }

  // -----------------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------------

  /**
   * Create a new sale record with items and payments.
   * Uses a transaction to ensure atomicity.
   */
  async create(data: CreateSaleRequest, ctx: SaleContext) {
    const invoiceNumber = await this.generateInvoiceNumber(ctx)

    const result = await this.db.$transaction(async (tx: any) => {
      const sale = await tx.salesTransaction.create({
        data: {
          tenant_id: ctx.tenantId,
          branch_id: ctx.branchId,
          customer_id: data.customerId ?? null,
          invoice_number: invoiceNumber,
          channel: data.channel,
          status: 'COMPLETED',
          subtotal: data.items.reduce((sum: number, item: CreateSaleItemRequest) => sum + item.quantity * item.unitPrice, 0),
          discount_total: data.discountTotal ?? 0,
          tax_total: data.taxTotal ?? 0,
          grand_total: data.items.reduce((sum: number, item: CreateSaleItemRequest) => sum + item.quantity * item.unitPrice, 0) - (data.discountTotal ?? 0) + (data.taxTotal ?? 0),
          reward_gallons_redeemed: data.redeemFreeGallons ?? 0,
          notes: data.notes ?? null,
          created_by: ctx.userId,
        },
      })

      // Create sale items
      for (const item of data.items) {
        await tx.salesTransactionItem.create({
          data: {
            sales_transaction_id: sale.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            discount_amount: item.discountAmount ?? 0,
            line_total: item.quantity * item.unitPrice - (item.discountAmount ?? 0),
          },
        })
      }

      // Create payments
      for (const payment of data.payments) {
        await tx.payment.create({
          data: {
            tenant_id: ctx.tenantId,
            sales_transaction_id: sale.id,
            customer_id: data.customerId ?? null,
            payment_method: payment.method,
            amount: payment.amount,
            reference_number: payment.reference ?? null,
            status: 'CONFIRMED',
            paid_at: new Date(),
            collected_by: ctx.userId,
          },
        })
      }

      // Fetch the complete sale with relations
      const fullSale = await tx.salesTransaction.findFirst({
        where: { id: sale.id },
        include: {
          items: true,
          payments: true,
          customer: { select: { full_name: true, phone: true, email: true } },
        },
      })

      return fullSale
    })

    return result
  }

  // -----------------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------------

  /**
   * Update an existing sale record.
   */
  async update(id: string, data: UpdateSaleRequest, ctx: SaleContext) {
    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('SalesTransaction')
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.channel !== undefined) updateData.channel = data.channel
    if (data.notes !== undefined) updateData.notes = data.notes

    const updated = await this.db.salesTransaction.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        payments: true,
        customer: { select: { full_name: true, phone: true, email: true } },
      },
    })

    return updated
  }

  // -----------------------------------------------------------------------
  // DELETE (soft)
  // -----------------------------------------------------------------------

  /**
   * Soft-delete a sale (`deleted_at = NOW()`).
   */
  async remove(id: string, ctx: SaleContext) {
    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('SalesTransaction')
    }

    return this.db.salesTransaction.update({
      where: { id },
      data: { deleted_at: new Date() },
    })
  }

  // -----------------------------------------------------------------------
  // PAYMENT
  // -----------------------------------------------------------------------

  /**
   * Record a new payment against a sale.
   */
  async recordPayment(saleId: string, data: RecordPaymentRequest, ctx: SaleContext) {
    const sale = await this.findUnique(saleId, ctx)
    if (!sale) {
      throw new NotFoundError('SalesTransaction')
    }

    const payment = await this.db.payment.create({
      data: {
        tenant_id: ctx.tenantId,
        sales_transaction_id: saleId,
        customer_id: sale.customer_id,
        payment_method: data.method,
        amount: data.amount,
        reference_number: data.reference ?? null,
        status: 'CONFIRMED',
        paid_at: new Date(),
        collected_by: ctx.userId,
      },
    })

    // Note: amount_tendered and change_amount are not stored on the sale entity
    // in the current Prisma schema. Payment totals are derived from the Payment table.
    return payment
  }

  // -----------------------------------------------------------------------
  // VOID
  // -----------------------------------------------------------------------

  /**
   * Void a sale transaction.
   */
  async voidSale(saleId: string, data: VoidSaleRequest, ctx: SaleContext) {
    const sale = await this.findUnique(saleId, ctx)
    if (!sale) {
      throw new NotFoundError('SalesTransaction')
    }

    const updated = await this.db.salesTransaction.update({
      where: { id: saleId },
      data: {
        status: 'VOID',
        void_reason: data.reason,
        voided_by: ctx.userId,
        voided_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        items: true,
        payments: true,
        customer: { select: { full_name: true, phone: true, email: true } },
      },
    })

    return updated
  }

  // -----------------------------------------------------------------------
  // DAILY SUMMARY
  // -----------------------------------------------------------------------

  /**
   * Get daily sales summary for a branch or tenant.
   */
  async getDailySummary(date: string, branchId: string | null, ctx: SaleContext) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      status: 'COMPLETED',
      created_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
    }
    if (branchId) {
      where.branch_id = branchId
    } else if (ctx.branchId) {
      where.branch_id = ctx.branchId
    }

    const sales = await this.db.salesTransaction.findMany({
      where,
      include: {
        items: true,
        payments: true,
      },
    })

    const totalSales = sales.length
    const totalGrandTotal = sales.reduce((sum: number, s: any) => sum + Number(s.grand_total), 0)
    const totalItemsSold = sales.reduce((sum: number, s: any) => sum + s.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0)
    const totalDiscount = sales.reduce((sum: number, s: any) => sum + Number(s.discount_total), 0)
    const totalTax = sales.reduce((sum: number, s: any) => sum + Number(s.tax_total), 0)
    const totalCash = sales.reduce((sum: number, s: any) => sum + s.payments.filter((p: any) => p.payment_method === 'CASH').reduce((pSum: number, p: any) => pSum + Number(p.amount), 0), 0)
    const totalEwallet = sales.reduce((sum: number, s: any) => sum + s.payments.filter((p: any) => p.payment_method === 'GCASH' || p.payment_method === 'MAYA').reduce((pSum: number, p: any) => pSum + Number(p.amount), 0), 0)
    const totalOnAccount = sales.reduce((sum: number, s: any) => sum + s.payments.filter((p: any) => p.payment_method === 'ON_ACCOUNT').reduce((pSum: number, p: any) => pSum + Number(p.amount), 0), 0)

    const byChannel = {
      inStore: sales.filter((s: any) => s.channel === 'IN_STORE').length,
      delivery: sales.filter((s: any) => s.channel === 'DELIVERY').length,
      reseller: sales.filter((s: any) => s.channel === 'RESELLER').length,
    }

    const byPaymentMethod = {
      cash: totalCash,
      gcash: sales.reduce((sum: number, s: any) => sum + s.payments.filter((p: any) => p.payment_method === 'GCASH').reduce((pSum: number, p: any) => pSum + Number(p.amount), 0), 0),
      maya: sales.reduce((sum: number, s: any) => sum + s.payments.filter((p: any) => p.payment_method === 'MAYA').reduce((pSum: number, p: any) => pSum + Number(p.amount), 0), 0),
      bankTransfer: sales.reduce((sum: number, s: any) => sum + s.payments.filter((p: any) => p.payment_method === 'BANK_TRANSFER').reduce((pSum: number, p: any) => pSum + Number(p.amount), 0), 0),
      onAccount: totalOnAccount,
    }

    return {
      date,
      totalSales: totalGrandTotal,
      totalTransactions: totalSales,
      totalItemsSold,
      totalDiscount,
      totalTax,
      totalGrandTotal,
      totalCash,
      totalEwallet,
      totalOnAccount,
      byChannel,
      byPaymentMethod,
    }
  }

  // -----------------------------------------------------------------------
  // HELPERS
  // -----------------------------------------------------------------------

  /**
   * Generate a unique invoice number for the branch.
   */
  private async generateInvoiceNumber(ctx: SaleContext): Promise<string> {
    const branchId = ctx.branchId ?? 'HQ'
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `INV-${branchId.slice(0, 8)}-${datePart}`

    const lastSale = await this.db.salesTransaction.findFirst({
      where: {
        invoice_number: { startsWith: prefix },
        tenant_id: ctx.tenantId,
      },
      orderBy: { invoice_number: 'desc' },
    })

    let sequence = 1
    if (lastSale) {
      const parts = lastSale.invoice_number.split('-')
      const lastSeq = parseInt(parts[parts.length - 1] || '0', 10)
      sequence = lastSeq + 1
    }

    return `${prefix}-${String(sequence).padStart(5, '0')}`
  }
}

/**
 * Singleton instance exported for dependency injection in the service layer.
 */
export const saleRepository = new SaleRepository()
