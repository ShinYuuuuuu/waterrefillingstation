import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import {
  ProductContext,
  ProductListQuery,
  ProductListResponse,
  ProductResponse,
  CreateProductRequest,
  UpdateProductRequest,
  ProductType,
} from './product.types'
import { ProductMapper } from './product.mapper'
import { ProductRepository, productRepository } from './product.repository'

/**
 * Application service for the Product Management module.
 *
 * The service layer is the orchestrator: it invokes the repository for
 * data access, enforces business rules, performs DTO mapping, and creates
 * audit log entries.  It never touches Prisma directly for product data —
 * only for audit-log writes (a cross-cutting concern), following the same
 * pattern as AuthService (see auth.service.ts).
 */
export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  /**
   * Create a new product within the caller's tenant.
   *
   * Business rules:
   *  - SKU must be unique within the tenant.
   *  - Container products (`type === 'CONTAINER'`) require `isContainer = true`.
   *  - Container products with `isContainer = true` require a `depositAmount`.
   *  - AuditLog entry recorded on success.
   */
  async createProduct(data: CreateProductRequest, ctx: ProductContext): Promise<ProductResponse> {
    logger.debug('Request to create product', { tenantId: ctx.tenantId, sku: data.sku })

    // Rule: SKU must be unique within the tenant
    const existing = await this.repository.findBySku(data.sku, ctx)
    if (existing) {
      throw new AppError(httpStatus.CONFLICT, `Product with SKU '${data.sku}' already exists`)
    }

    // Rule: Container products require deposit amount
    if (data.type === 'CONTAINER') {
      if (data.isContainer && (data.depositAmount === undefined || data.depositAmount === null || Number(data.depositAmount) <= 0)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Container products require a deposit amount greater than 0')
      }
    }

    // Auto-assign category if missing
    if (!data.categoryId) {
      let category = await prisma.productCategory.findFirst({
        where: { tenant_id: ctx.tenantId, is_active: true, deleted_at: null },
      })
      if (!category) {
        category = await prisma.productCategory.create({
          data: {
            tenant_id: ctx.tenantId,
            name: 'Uncategorized',
            is_active: true,
          },
        })
      }
      data.categoryId = category.id
    }

    const created = await this.repository.create(data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'Product',
      entityId: created.id,
      afterData: created,
    })

    return ProductMapper.toResponse(created)
  }

  /**
   * Retrieve a single product by ID.
   *
   * @throws NotFoundError if the product does not exist or is soft-deleted.
   */
  async getProduct(id: string, ctx: ProductContext): Promise<ProductResponse> {
    logger.debug('Fetching product', { id, tenantId: ctx.tenantId })

    const product = await this.repository.findUnique(id, ctx)
    if (!product) {
      throw new NotFoundError('Product')
    }

    return ProductMapper.toResponse(product)
  }

  /**
   * Retrieve a paginated list of products with filtering, search, and sorting.
   *
   * All results are scoped to the caller's tenant.
   */
  async getProducts(query: ProductListQuery, ctx: ProductContext): Promise<ProductListResponse> {
    logger.debug('Listing products', { tenantId: ctx.tenantId })

    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 20, 100)

    const { data, total } = await this.repository.findMany(
      { ...query, page, limit },
      ctx,
    )

    const mapped = data.map(ProductMapper.toResponse)

    return {
      data: mapped,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Update an existing product.
   *
   * Business rules:
   *  - SKU must remain unique within the tenant (excluding this record).
   *  - Immutable fields (`tenant_id`, `created_by`) are silently dropped
   *    by the mapper.
   *  - AuditLog entry with before/after snapshots.
   */
  async updateProduct(
    id: string,
    data: UpdateProductRequest,
    ctx: ProductContext,
  ): Promise<ProductResponse> {
    logger.debug('Request to update product', { id, tenantId: ctx.tenantId })

    if (data.sku) {
      const existing = await this.repository.findBySku(data.sku, ctx, id)
      if (existing) {
        throw new AppError(httpStatus.CONFLICT, `Product with SKU '${data.sku}' already exists`)
      }
    }

    const before = await this.repository.findUnique(id, ctx)
    if (!before) {
      throw new NotFoundError('Product')
    }

    const updated = await this.repository.update(id, data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Product',
      entityId: id,
      beforeData: before,
      afterData: updated,
    })

    return ProductMapper.toResponse(updated)
  }

  /**
   * Soft-delete a product.
   *
   * Pre-condition checks (all must pass before deletion):
   *  1. No active inventory — the product must not have `quantity_on_hand`
   *     or `reserved_quantity > 0` in any branch's `branch_inventory`.
   *  2. No active sale references — the product must not appear in any
   *     completed (non-voided, non-refunded) sales transaction.
   *
   * @throws NotFoundError if the product does not exist.
   * @throws AppError(409) if any pre-condition fails.
   */
  async deleteProduct(id: string, ctx: ProductContext): Promise<void> {
    logger.debug('Request to delete product', { id, tenantId: ctx.tenantId })

    const product = await this.repository.findUnique(id, ctx)
    if (!product) {
      throw new NotFoundError('Product')
    }

    // Pre-condition 1: No active inventory
    if (await this.repository.hasActiveInventory(id, ctx)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Cannot delete product with active inventory',
      )
    }

    // Pre-condition 2: No active sale references
    if (await this.repository.hasActiveSaleReferences(id, ctx)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Cannot delete product referenced by active sales',
      )
    }

    const deleted = await this.repository.remove(id, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'Product',
      entityId: id,
      beforeData: deleted,
    })
  }

  /**
   * Persist an AuditLog entry.  Uses `prisma` directly (same pattern as
   * AuthService) because audit logging is a cross-cutting concern not
   * owned by the Product repository.
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

  /** Deep-clone a value so mutable references are not shared with callers. */
  private deepClone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value))
  }
}

/**
 * Singleton instance exported for the controller layer.
 * Uses the repository singleton by default; inject a mock for testing.
 */
export const productService = new ProductService(productRepository)
