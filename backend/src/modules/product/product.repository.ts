import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { pagination } from '../../constants'
import {
  Product,
  ProductContext,
  ProductListQuery,
  CreateProductRequest,
  UpdateProductRequest,
} from './product.types'
import { ProductMapper } from './product.mapper'

/**
 * Data-access layer for the Product Management module.
 *
 * All queries are scoped by `tenant_id` (multi-tenant isolation per
 * AI_PROJECT_RULES.md §5.1).  Soft deletes (`deleted_at`) are applied to
 * every read query so historical data is preserved (§4.5).
 *
 * The repository is the only layer that touches Prisma for product data;
 * the service and controller layers never import `prisma` directly
 * (dependency inversion per §3.3).
 */
export class ProductRepository {
  /** Shared Prisma client instance. */
  private readonly db = prisma

  /**
   * Build a WHERE clause fragment that enforces tenant isolation and
   * soft-delete exclusion.
   */
  private buildScopeWhere(ctx: ProductContext, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...extra,
    }
  }

  /**
   * Retrieve a paginated list of products.
   *
   * Supports optional filtering (category, type, isActive, isContainer),
   * full-text search across SKU / name / description, sorting, and
   * standard `page`/`limit` pagination.
   *
   * @param query  Filter / pagination / sort options from the API request.
   * @param ctx    Tenant context.
   * @returns      `{ data, total }` for the current page.
   */
  async findMany(
    query: ProductListQuery,
    ctx: ProductContext,
  ): Promise<{ data: Product[]; total: number }> {
    const where = this.buildScopeWhere(ctx)

    if (query.category) {
      where.category_id = query.category
    }
    if (query.type) {
      where.type = query.type
    }
    if (query.isActive !== undefined) {
      where.is_active = query.isActive
    }
    if (query.isContainer !== undefined) {
      where.is_container = query.isContainer
    }
    if (query.search) {
      where.OR = [
        { sku: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit

    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy = { [sortBy]: sortOrder }

    logger.debug('Querying products', { tenantId: ctx.tenantId, page, limit, sortBy })

    const [total, data] = await this.db.$transaction([
      this.db.product.count({ where }),
      this.db.product.findMany({ where, orderBy, skip, take: limit }),
    ])

    return { data, total }
  }

  /**
   * Retrieve a single product by ID.
   *
   * @param id   The product's UUID primary key.
   * @param ctx  Tenant context.
   * @returns    The product entity, or `null` if not found / soft-deleted.
   */
  async findUnique(id: string, ctx: ProductContext): Promise<Product | null> {
    return this.db.product.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
    })
  }

  /**
   * Check for an existing product with the given SKU within the tenant.
   *
   * @param sku       The SKU to check.
   * @param ctx       Tenant context.
   * @param excludeId When provided (e.g. during updates), skips this record.
   * @returns         A conflicting product entity, or `null`.
   */
  async findBySku(sku: string, ctx: ProductContext, excludeId?: string): Promise<Product | null> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      sku,
      deleted_at: null,
    }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    return this.db.product.findFirst({ where })
  }

  /**
   * Create a new product record.
   *
   * @param data  Validated create payload (camelCase API DTO).
   * @param ctx   Tenant context.
   * @returns     The newly created product entity.
   */
  async create(data: CreateProductRequest, ctx: ProductContext): Promise<Product> {
    const input = ProductMapper.toCreateInput(data, ctx)
    logger.debug('Creating product record', { tenantId: ctx.tenantId, sku: data.sku })
    return this.db.product.create({ data: input })
  }

  /**
   * Update an existing product record.
   *
   * @param id     The product's primary key.
   * @param data   Validated update payload (camelCase API DTO).
   * @param ctx    Tenant context.
   * @returns      The updated product entity.
   * @throws       NotFoundError if the product does not exist or is soft-deleted.
   */
  async update(id: string, data: UpdateProductRequest, ctx: ProductContext): Promise<Product> {
    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Product')
    }

    const input = ProductMapper.toUpdateInput(data)
    logger.debug('Updating product record', { id, tenantId: ctx.tenantId })
    return this.db.product.update({
      where: { id },
      data: input,
    })
  }

  /**
   * Soft-delete a product (`deleted_at = NOW()`).
   *
   * @param id     The product's primary key.
   * @param ctx    Tenant context.
   * @returns      The product entity as it was before deletion.
   * @throws       NotFoundError if the product does not exist or is soft-deleted.
   */
  async remove(id: string, ctx: ProductContext): Promise<Product> {
    logger.debug('Soft-deleting product record', { id, tenantId: ctx.tenantId })

    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Product')
    }

    return this.db.product.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    })
  }

  /**
   * Archive a product by setting `is_active = false`.
   *
   * This preserves all historical data (inventory, sales, etc.) while
   * removing the product from active sale flows.
   *
   * @param id     The product's primary key.
   * @param ctx    Tenant context.
   * @returns      The archived product entity.
   * @throws       NotFoundError if the product does not exist or is soft-deleted.
   */
  async archive(id: string, ctx: ProductContext): Promise<Product> {
    logger.debug('Archiving product record', { id, tenantId: ctx.tenantId })

    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Product')
    }

    return this.db.product.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    })
  }

  /**
   * Reactivate an archived product by setting `is_active = true`.
   *
   * @param id     The product's primary key.
   * @param ctx    Tenant context.
   * @returns      The reactivated product entity.
   * @throws       NotFoundError if the product does not exist or is soft-deleted.
   */
  async reactivate(id: string, ctx: ProductContext): Promise<Product> {
    logger.debug('Reactivating product record', { id, tenantId: ctx.tenantId })

    const existing = await this.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Product')
    }

    return this.db.product.update({
      where: { id },
      data: {
        is_active: true,
        updated_at: new Date(),
      },
    })
  }

  // -----------------------------------------------------------------------
  // Pre-condition checks for soft-delete
  // -----------------------------------------------------------------------

  /**
   * Check whether the product currently has stock on hand at any branch
   * (`branch_inventory` with `quantity_on_hand > 0` or `reserved_quantity > 0`).
   */
  async hasActiveInventory(id: string, ctx: ProductContext): Promise<boolean> {
    const count = await this.db.branchInventory.count({
      where: {
        tenant_id: ctx.tenantId,
        product_id: id,
        deleted_at: null,
        OR: [
          { quantity_on_hand: { gt: 0 } },
          { reserved_quantity: { gt: 0 } },
        ],
      },
    })
    return count > 0
  }

  /**
   * Check whether the product is referenced by any completed (non-voided,
   * non-refunded) sales transaction.
   */
  async hasActiveSaleReferences(id: string, ctx: ProductContext): Promise<boolean> {
    const count = await this.db.salesTransactionItem.count({
      where: {
        product_id: id,
        sales_transaction: {
          deleted_at: null,
          voided_at: null,
          status: { notIn: ['VOID', 'REFUNDED'] },
        },
      },
    })
    return count > 0
  }
}

/**
 * Singleton instance exported for the service layer.
 */
export const productRepository = new ProductRepository()
