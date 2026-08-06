import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { NotFoundError, AppError } from '../../middleware/errorHandler'
import { pagination } from '../../constants'
import {
  Gallon,
  GallonContext,
  GallonListQuery,
  CreateGallonRequest,
  UpdateGallonRequest,
  ContainerStatus,
  VALID_STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
} from './gallon.types'
import { GallonMapper } from './gallon.mapper'

/**
 * Data-access layer for the Gallon Asset Management module.
 *
 * All queries are scoped by `tenant_id` and `branch_id` (multi-tenant and
 * multi-branch isolation per AI_PROJECT_RULES.md §3.5 and §5.1).  Soft deletes
 * (`deleted_at`) are applied to every read query so historical data is
 * preserved (§4.5).
 *
 * The repository is the only layer that touches Prisma for gallon data;
 * the service and controller layers never import `prisma` directly for
 * gallon data (dependency inversion per §3.3).
 */
export class GallonRepository {
  /** Shared Prisma client instance. */
  private readonly db = prisma

  /**
   * Build a WHERE clause fragment that enforces tenant and branch isolation
   * plus soft-delete exclusion.
   */
  private buildScopeWhere(ctx: GallonContext, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...extra,
    }

    if (ctx.branchId) {
      where.branch_id = ctx.branchId
    }

    return where
  }

  /**
   * Create a new gallon asset.
   *
   * @param data  Validated create payload.
   * @param ctx   Tenant/branch/user context.
   * @returns     The created Gallon entity.
   */
  async create(data: CreateGallonRequest, ctx: GallonContext): Promise<Gallon> {
    const input = GallonMapper.toCreateInput(data, ctx)
    logger.debug('Creating gallon record', { tenantId: ctx.tenantId, tagCode: data.tagCode })
    return this.db.gallon.create({ data: input }) as Promise<Gallon>
  }

  /**
   * Retrieve a single gallon by ID, scoped to the tenant and branch.
   *
   * @param id   The gallon's UUID primary key.
   * @param ctx  Tenant/branch context.
   * @returns    The gallon entity, or `null` if not found / soft-deleted.
   */
  async findUnique(id: string, ctx: GallonContext): Promise<Gallon | null> {
    return this.db.gallon.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
    }) as Promise<Gallon | null>
  }

  /**
   * Check if a tag code is already in use within the tenant.
   *
   * @param tagCode  The tag code to check.
   * @param ctx      Tenant/branch context.
   * @param excludeId  When provided (e.g. during updates), skips this record.
   * @returns        A conflicting gallon entity, or `null`.
   */
  async findByTagCode(tagCode: string, ctx: GallonContext, excludeId?: string): Promise<Gallon | null> {
    const where: Record<string, unknown> = this.buildScopeWhere(ctx, { tag_code: tagCode })

    if (excludeId) {
      where.id = { not: excludeId }
    }

    return this.db.gallon.findFirst({ where }) as Promise<Gallon | null>
  }

  /**
   * Check if a serial number is already in use within the tenant.
   */
  async findBySerialNumber(serialNumber: string, ctx: GallonContext, excludeId?: string): Promise<Gallon | null> {
    const where: Record<string, unknown> = this.buildScopeWhere(ctx, { serial_number: serialNumber })

    if (excludeId) {
      where.id = { not: excludeId }
    }

    return this.db.gallon.findFirst({ where }) as Promise<Gallon | null>
  }

  /**
   * Retrieve a paginated, filterable, sortable list of gallons.
   *
   * @param query  Filter / pagination / sort options.
   * @param ctx    Tenant/branch context.
   * @returns      `{ data, total }` for the current page.
   */
  async findMany(query: GallonListQuery, ctx: GallonContext): Promise<{ data: Gallon[]; total: number }> {
    const where = this.buildScopeWhere(ctx) as Record<string, unknown>

    if (query.status) {
      where.status = query.status
    }
    if (query.isActive !== undefined) {
      where.is_active = query.isActive
    }
    if (query.search) {
      where.OR = [
        { tag_code: { contains: query.search, mode: 'insensitive' } },
        { serial_number: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit

    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy = { [sortBy]: sortOrder }

    logger.debug('Querying gallons', {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      page,
      limit,
      sortBy,
    })

    const [total, data] = await this.db.$transaction([
      this.db.gallon.count({ where }),
      this.db.gallon.findMany({ where, orderBy, skip, take: limit }),
    ])

    return { data: data as Gallon[], total }
  }

  /**
   * Update a single gallon by ID, scoped to the tenant.
   *
   * @param id     The gallon's UUID.
   * @param data   Validated update payload.
   * @param ctx    Tenant/branch context.
   * @returns      The updated gallon entity, or `null` if not found.
   */
  async update(id: string, data: UpdateGallonRequest, ctx: GallonContext): Promise<Gallon | null> {
    const input = GallonMapper.toUpdateInput(data)
    logger.debug('Updating gallon record', { id, tenantId: ctx.tenantId })

    const where = this.buildScopeWhere(ctx, { id })

    return this.db.gallon.updateMany({
      where,
      data: input,
    }).then((count: number) => {
      if (count === 0) return null
      return this.findUnique(id, ctx)
    }) as Promise<Gallon | null>
  }

  /**
   * Update only the status of a gallon (used by status transition logic).
   */
  async updateStatus(id: string, status: ContainerStatus, ctx: GallonContext, notes?: string): Promise<Gallon | null> {
    const where = this.buildScopeWhere(ctx, { id })

    await this.db.gallon.updateMany({
      where,
      data: { status, updated_at: new Date() },
    })

    return this.findUnique(id, ctx)
  }

  /**
   * Soft-delete a gallon (`deleted_at = NOW()`).
   *
   * @param id     The gallon's UUID.
   * @param ctx    Tenant/branch context.
   * @returns      The gallon entity as it was before deletion, or `null`.
   */
  async remove(id: string, ctx: GallonContext): Promise<Gallon | null> {
    logger.debug('Soft-deleting gallon record', { id, tenantId: ctx.tenantId })

    const where = this.buildScopeWhere(ctx, { id })

    return this.db.gallon.updateMany({
      where,
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    }).then((count: number) => {
      if (count === 0) return null
      return this.db.gallon.findFirst({
        where: { id },
      })
    }) as Promise<Gallon | null>
  }

  /**
   * Validate that the status transition is allowed.
   *
   * @throws AppError if the transition is invalid.
   */
  validateStatusTransition(current: ContainerStatus, next: ContainerStatus): void {
    // Terminal statuses cannot be left
    if (TERMINAL_STATUSES.includes(current)) {
      throw new AppError(422, `Cannot change status from ${current} — terminal state`)
    }

    const allowed = VALID_STATUS_TRANSITIONS[current] || []
    if (!allowed.includes(next)) {
      throw new AppError(422, `Invalid status transition: ${current} → ${next}`)
    }
  }
}

/**
 * Shared repository instance, mirroring the pattern in product.service.ts
 * where the service receives the repository via constructor injection.
 */
export const gallonRepository = new GallonRepository()
