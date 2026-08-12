import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import {
  CustomerContext,
  CustomerListQuery,
  CustomerListResponse,
  CustomerResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerPurchaseSummary,
  CustomerSalesHistoryResponse,
} from './customer.types'
import { CustomerMapper } from './customer.mapper'
import { CustomerRepository, customerRepository } from './customer.repository'

/**
 * Application service for the Customer Management module.
 *
 * The service layer is the orchestrator: it invokes the repository for data
 * access, enforces business rules, performs DTO mapping, and creates audit
 * log entries.  It never touches Prisma directly for customer data — only
 * for audit-log writes (a cross-cutting concern), following the same pattern
 * as AuthService (see auth.service.ts).
 *
 * The service injects a repository instance so it can be unit-tested with a
 * mock in place of the real Prisma-backed repository.
 */
export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  // -----------------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------------

  /**
   * Create a new customer within the caller's tenant and branch.
   *
   * Business rules:
   *  - Branch context is required (HQ/Owner must specify a branch for creation).
   *  - Phone must be unique within the tenant.
   *  - Email must be unique within the tenant (when provided).
   *  - A default loyalty tier is assigned based on the tenant's LoyaltyTier
   *    configuration (the tier with min_points = 0, falling back to 'Bronze').
   *  - CustomerContainerBalance entries are initialised for every container
   *    product in the tenant.
   *  - An AuditLog entry records the creation.
   *  - The customer entity is mapped to the API response DTO.
   */
  async createCustomer(data: CreateCustomerRequest, ctx: CustomerContext): Promise<CustomerResponse> {
    if (!ctx.branchId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'A branch context is required to create a customer')
    }

    // --- Duplicate phone / email / name check within tenant ---
    const existing = await this.repository.findDuplicate(data.phone ?? '', data.email ?? null, data.fullName, ctx)
    if (existing) {
      throw new AppError(httpStatus.CONFLICT, 'A customer with this phone number, email, or name already exists')
    }

    // --- Create the customer record ---
    const customer = await this.repository.create(data, ctx)

    // --- Initialise container balances for all container-type products ---
    await this.repository.initializeContainerBalances(customer.id, ctx)

    // --- Audit log ---
    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: customer.id,
      afterData: CustomerMapper.toResponse(customer),
    })

    logger.info('Customer created', { id: customer.id, tenantId: ctx.tenantId })
    return CustomerMapper.toResponse(customer)
  }

  // -----------------------------------------------------------------------
  // READ — single
  // -----------------------------------------------------------------------

  /**
   * Retrieve a single customer by ID.
   *
   * Throws NotFoundError if the customer does not exist, has been soft-deleted,
   * or does not belong to the caller's tenant/branch.
   */
  async getCustomer(id: string, ctx: CustomerContext): Promise<CustomerResponse> {
    const customer = await this.repository.findUnique(id, ctx)

    if (!customer) {
      throw new NotFoundError('Customer')
    }

    return CustomerMapper.toResponse(customer)
  }

  // -----------------------------------------------------------------------
  // READ — list
  // -----------------------------------------------------------------------

  /**
   * Retrieve a paginated list of customers.
   *
   * Supports search (name / phone / email), status filter, customer-type
   * filter, and branch scoping.  HQ/Owner users (branchId === null) see
   * customers across all branches in the tenant; branch-scoped users see
   * only their own branch's customers.
   */
  async getCustomers(query: CustomerListQuery, ctx: CustomerContext): Promise<CustomerListResponse> {
    const { data, total } = await this.repository.findMany(query, ctx)

    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const totalPages = Math.ceil(total / limit)

    return {
      data: data.map(CustomerMapper.toResponse),
      meta: { page, limit, total, totalPages },
    }
  }

  // -----------------------------------------------------------------------
  // PURCHASE SUMMARY
  // -----------------------------------------------------------------------

  /**
   * Get purchase summary for a single customer derived from SalesTransaction data.
   *
   * Business rules:
   *  - Only COMPLETED sales are counted.
   *  - Gallons = sum of item quantities across all completed sales.
   *  - Total spent = sum of grand_total across all completed sales.
   *  - Last purchase = most recent created_at of a completed sale.
   */
  async getCustomerPurchaseSummary(id: string, ctx: CustomerContext): Promise<CustomerPurchaseSummary> {
    const customer = await this.repository.findUnique(id, ctx)
    if (!customer) {
      throw new NotFoundError('Customer')
    }

    const summary = await prisma.salesTransaction.aggregate({
      where: {
        tenant_id: ctx.tenantId,
        deleted_at: null,
        customer_id: id,
        status: 'COMPLETED',
        ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      },
      _count: { id: true },
      _sum: { grand_total: true },
      _max: { created_at: true },
    })

    const totalGallons = await prisma.salesTransactionItem.aggregate({
      where: {
        sales_transaction: {
          tenant_id: ctx.tenantId,
          deleted_at: null,
          customer_id: id,
          status: 'COMPLETED',
          ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
        },
      },
      _sum: { quantity: true },
    })

    return {
      customerId: id,
      totalPurchases: summary._count.id,
      totalGallons: Number(totalGallons._sum.quantity ?? 0),
      totalSpent: Number(summary._sum.grand_total ?? 0),
      lastPurchase: summary._max.created_at?.toISOString() ?? null,
    }
  }

  /**
   * Get paginated sales history for a customer.
   */
  async getCustomerSalesHistory(
    id: string,
    query: CustomerListQuery,
    ctx: CustomerContext,
  ): Promise<CustomerSalesHistoryResponse> {
    const customer = await this.repository.findUnique(id, ctx)
    if (!customer) {
      throw new NotFoundError('Customer')
    }

    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      customer_id: id,
      status: 'COMPLETED',
    }
    if (ctx.branchId) {
      where.branch_id = ctx.branchId
    }

    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    const [total, sales] = await prisma.salesTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        items: {
          select: {
            quantity: true,
          },
        },
        payments: {
          select: {
            payment_method: true,
            reference_number: true,
          },
        },
      },
    })

    const data = sales.map((sale: any) => ({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      date: sale.created_at.toISOString(),
      quantity: sale.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      amount: Number(sale.grand_total),
      channel: sale.channel,
      paymentMethod: sale.payments[0]?.payment_method ?? null,
      paymentReference: sale.payments[0]?.reference_number ?? null,
    }))

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  // -----------------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------------

  /**
   * Update an existing customer.
   *
   * Business rules:
   *  - `current_balance` cannot be modified here — it is derived from
   *    payments and ledger entries.  Attempting to set it returns 403.
   *  - Phone and email must remain unique within the tenant (excluding
   *    the record being updated).
   *  - Immutable fields (`tenant_id`, `branch_id`, `created_by`) are
   *    silently dropped by the mapper and cannot be changed.
   *  - An AuditLog entry with before/after snapshots is created.
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerRequest,
    ctx: CustomerContext,
  ): Promise<CustomerResponse> {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Customer')
    }

    // --- Prevent unauthorised balance modification ---
    if (data.currentBalance !== undefined) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Customer balance can only be adjusted through the payment ledger',
      )
    }

    // --- Duplicate phone / email / name check (exclude current record) ---
    const phoneToCheck = data.phone ?? existing.phone
    const emailToCheck = data.email ?? existing.email
    const nameToCheck = data.fullName ?? existing.full_name
    if (data.phone || data.email || data.fullName) {
      const conflict = await this.repository.findDuplicate(phoneToCheck, emailToCheck ?? null, nameToCheck, ctx, id)
      if (conflict) {
        throw new AppError(
          httpStatus.CONFLICT,
          'A different customer with this phone number, email, or name already exists',
        )
      }
    }

    const before = CustomerMapper.toResponse(existing)

    const updated = await this.repository.update(id, data, ctx)
    const after = CustomerMapper.toResponse(updated)

    // --- Audit log (before → after) ---
    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: id,
      beforeData: before,
      afterData: after,
    })

    logger.info('Customer updated', { id, tenantId: ctx.tenantId })
    return after
  }

  // -----------------------------------------------------------------------
  // DELETE (soft)
  // -----------------------------------------------------------------------

  /**
   * Soft-delete a customer.
   *
   * Hard deletion is never performed on customer records (AI_PROJECT_RULES.md
   * §4.5 — financial and transactional data must be retained).
   *
   * Before deletion, the following pre-conditions are verified:
   *  1. No outstanding (positive) balance.
   *  2. No active delivery orders (non-terminal status).
   *  3. No unpaid invoices (unpaid CustomerLedger entries).
   *  4. No active installment plans.
   *
   * If any pre-condition fails, a descriptive business error (409 Conflict)
   * is thrown so the caller can take corrective action.
   */
  async deleteCustomer(id: string, ctx: CustomerContext): Promise<void> {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Customer')
    }

    // --- Pre-condition checks ---
    if (await this.repository.hasOutstandingBalance(id, ctx)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Cannot delete customer with outstanding balance',
      )
    }

    if (await this.repository.hasActiveDeliveryOrders(id, ctx)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Cannot delete customer with active delivery orders',
      )
    }

    if (await this.repository.hasUnpaidInvoices(id, ctx)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Cannot delete customer with unpaid invoices',
      )
    }

    if (await this.repository.hasActiveInstallmentPlans(id, ctx)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Cannot delete customer with active installment plans',
      )
    }

    // --- Soft delete ---
    const before = CustomerMapper.toResponse(existing)

    await this.repository.remove(id, ctx)

    // --- Audit log ---
    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'Customer',
      entityId: id,
      beforeData: before,
    })

    logger.info('Customer deleted', { id, tenantId: ctx.tenantId })
  }

  // -----------------------------------------------------------------------
  // Audit logging
  // -----------------------------------------------------------------------

  /**
   * Persist an AuditLog entry.  Uses `prisma` directly (same pattern as
   * AuthService) because audit logging is a cross-cutting concern not
   * owned by the Customer repository.
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
        before_data: params.beforeData
          ? { data: this.deepClone(params.beforeData) }
          : undefined,
        after_data: params.afterData
          ? { data: this.deepClone(params.afterData) }
          : undefined,
      },
    })
  }

  /** Shallow-clone a value so mutable references are not shared with callers. */
  private deepClone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value))
  }
}

/**
 * Singleton instance exported for the controller layer.
 * Uses the repository singleton by default; inject a mock for testing.
 */
export const customerService = new CustomerService(customerRepository)
