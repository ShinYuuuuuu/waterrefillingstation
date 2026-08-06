import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { NotFoundError } from '../../middleware/errorHandler'
import {
  Customer,
  CustomerContext,
  CustomerListQuery,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './customer.types'
import { CustomerMapper } from './customer.mapper'

/**
 * Data-access layer for the Customer module.
 *
 * All queries are scoped by `tenant_id` (multi-tenant isolation) and
 * `branch_id` (branch isolation) at the database level.  Soft deletes
 * (`deleted_at IS NULL`) are applied to every read query so that
 * historical data is preserved per AI_PROJECT_RULES.md §4.6.
 *
 * The repository is the only layer that touches Prisma; the service and
 * controller layers never import `prisma` directly (dependency inversion).
 */
export class CustomerRepository {
  /** Shared Prisma client instance. */
  private readonly db = prisma

  /**
   * Build a WHERE clause fragment that enforces tenant and branch isolation
   * plus soft-delete exclusion.  HQ/Owner users (branchId === null) are
   * scoped only by tenant, giving them a cross-branch view.
   */
  private buildScopeWhere(ctx: CustomerContext, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      ...extra,
    }
  }

  /**
   * Retrieve a paginated list of customers with optional search, filtering,
   * and sorting.
   *
   * @param query  Filter / pagination / sort options from the API request.
   * @param ctx    Tenant and branch context from the authenticated request.
   * @returns      `{ data, total }` for the current page.
   */
  async findMany(
    query: CustomerListQuery,
    ctx: CustomerContext,
  ): Promise<{ data: Customer[]; total: number }> {
    const where = this.buildScopeWhere(ctx)

    // Categorical filters
    if (query.customerType !== undefined) (where as Record<string, unknown>).customer_type = query.customerType
    if (query.status !== undefined) (where as Record<string, unknown>).status = query.status

    // Free-text search across name, phone, and email (case-insensitive)
    if (query.search) {
      (where as Record<string, unknown>).OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    // Sorting — default by creation date descending
    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy: Record<string, string> = { [sortBy]: sortOrder }

    // Pagination
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const skip = (page - 1) * limit

    // Execute count + page fetch in a single transaction for consistency
    const [total, data] = await this.db.$transaction([
      this.db.customer.count({ where }),
      this.db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ])

    logger.debug('Customer list query', {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      total,
      page,
      limit,
      search: query.search,
    })

    return { data: data as Customer[], total }
  }

  /**
   * Retrieve a single customer by primary key.
   *
   * @param id     The customer's UUID primary key.
   * @param ctx    Tenant and branch context.
   * @returns      The customer entity, or `null` if not found / soft-deleted.
   */
  async findUnique(id: string, ctx: CustomerContext): Promise<Customer | null> {
    const where = this.buildScopeWhere(ctx, { id })

    const customer = await this.db.customer.findFirst({ where })
    return customer as Customer | null
  }

  /**
   * Check for a duplicate customer (same phone or email within the tenant).
   *
   * @param phone       Phone number to check.
   * @param email       Email address to check (optional).
   * @param ctx         Tenant and branch context.
   * @param excludeId   When provided (e.g. during updates), skips this record.
   * @returns           A conflicting customer entity, or `null`.
   */
  async findDuplicate(
    phone: string,
    email: string | null | undefined,
    ctx: CustomerContext,
    excludeId?: string,
  ): Promise<Customer | null> {
    const or: Record<string, unknown>[] = [{ phone: { equals: phone } }]
    if (email) {
      or.push({ email: { equals: email } })
    }

    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      OR: or,
    }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const customer = await this.db.customer.findFirst({ where })
    return customer as Customer | null
  }

  /**
   * Create a new customer record.
   *
   * @param data   Validated create payload (camelCase API DTO).
   * @param ctx    Tenant and branch context.
   * @returns      The newly created customer entity.
   */
  async create(data: CreateCustomerRequest, ctx: CustomerContext): Promise<Customer> {
    const input = CustomerMapper.toCreateInput(data, ctx)

    const customer = await this.db.customer.create({ data: input })
    logger.debug('Customer created', { id: customer.id, tenantId: ctx.tenantId })

    return customer as Customer
  }

  /**
   * Update an existing customer record.
   *
   * @param id     The customer's primary key.
   * @param data   Validated update payload (camelCase API DTO).
   * @param ctx    Tenant and branch context.
   * @returns      The updated customer entity.
   * @throws       NotFoundError if the customer does not exist or is soft-deleted.
   */
  async update(id: string, data: UpdateCustomerRequest, ctx: CustomerContext): Promise<Customer> {
    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Customer')
    }

    const input = CustomerMapper.toUpdateInput(data)

    const customer = await this.db.customer.update({
      where: { id },
      data: input,
    })
    logger.debug('Customer updated', { id, tenantId: ctx.tenantId })

    return customer as Customer
  }

  /**
   * Soft-delete a customer (`deleted_at = NOW()`).
   *
   * @param id     The customer's primary key.
   * @param ctx    Tenant and branch context.
   * @returns      The customer entity as it was before deletion.
   * @throws       NotFoundError if the customer does not exist or is soft-deleted.
   */
  async remove(id: string, ctx: CustomerContext): Promise<Customer> {
    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Customer')
    }

    const customer = await this.db.customer.update({
      where: { id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    })
    logger.debug('Customer soft-deleted', { id, tenantId: ctx.tenantId })

    return customer as Customer
  }

  /**
   * Initialise zero-balance `customer_container_balances` for every
   * container-type product in the tenant.
   */
  async initializeContainerBalances(customerId: string, ctx: CustomerContext): Promise<void> {
    const containerProducts = await this.db.product.findMany({
      where: {
        tenant_id: ctx.tenantId,
        is_container: true,
        deleted_at: null,
      },
      select: { id: true },
    })

    if (containerProducts.length === 0) return

    await this.db.$transaction(
      containerProducts.map((product: { id: string }) =>
        this.db.customerContainerBalance.create({
          data: {
            customer_id: customerId,
            product_id: product.id,
            quantity_held: 0,
          },
        }),
      ),
    )

    logger.debug('Initialised container balances', {
      customerId,
      count: containerProducts.length,
      tenantId: ctx.tenantId,
    })
  }

  /**
   * Check whether the customer has an outstanding (positive) balance.
   */
  async hasOutstandingBalance(id: string, ctx: CustomerContext): Promise<boolean> {
    const customer = await this.findUnique(id, ctx)
    if (!customer) return false
    return Number(customer.current_balance) > 0
  }

  /**
   * Check whether the customer has active (non-terminal) delivery orders.
   * Terminal statuses: CANCELLED, RETURNED, FAILED.
   */
  async hasActiveDeliveryOrders(id: string, ctx: CustomerContext): Promise<boolean> {
    const where = this.buildScopeWhere(ctx)
    where.customer_id = id
    where.status = { notIn: ['CANCELLED', 'RETURNED', 'FAILED'] }

    const count = await this.db.deliveryOrder.count({ where })
    return count > 0
  }

  /**
   * Check whether the customer has unpaid ledger entries (outstanding invoices).
   */
  async hasUnpaidInvoices(id: string, ctx: CustomerContext): Promise<boolean> {
    const where = this.buildScopeWhere(ctx)
    where.customer_id = id
    where.is_paid = false

    const count = await this.db.customerLedger.count({ where })
    return count > 0
  }

  /**
   * Check whether the customer has active installment plans.
   */
  async hasActiveInstallmentPlans(id: string, ctx: CustomerContext): Promise<boolean> {
    const where = this.buildScopeWhere(ctx)
    where.customer_id = id
    where.status = 'active'

    const count = await this.db.installmentPlan.count({ where })
    return count > 0
  }
}

/**
 * Singleton instance exported for dependency injection in the service layer.
 */
export const customerRepository = new CustomerRepository()
