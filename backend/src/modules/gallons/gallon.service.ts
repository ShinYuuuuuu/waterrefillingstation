import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import {
  Gallon,
  GallonContext,
  GallonListQuery,
  GallonListResponse,
  GallonResponse,
  CreateGallonRequest,
  UpdateGallonRequest,
  ContainerStatus,
} from './gallon.types'
import { GallonMapper } from './gallon.mapper'
import { GallonRepository, gallonRepository } from './gallon.repository'
import { prisma } from '../../database'

/**
 * Application service for the Gallon Asset Management module.
 *
 * The service layer is the orchestrator: it invokes the repository for
 * data access, enforces business rules, performs DTO mapping, and creates
 * audit log entries.  It never touches Prisma directly for gallon data —
 * only for audit-log writes (a cross-cutting concern), following the same
 * pattern as ProductService.
 */
export class GallonService {
  constructor(private readonly repository: GallonRepository) {}

  /**
   * Create a new gallon asset.
   *
   * Business rules:
   *  - `tag_code` must be unique within the tenant.
   *  - `serial_number` must be unique within the tenant (if provided).
   *  - AuditLog entry recorded on success.
   *
   * @param data  Validated create payload.
   * @param ctx   Tenant/branch/user context.
   * @returns     Mapped gallon response DTO.
   */
  async createGallon(data: CreateGallonRequest, ctx: GallonContext): Promise<GallonResponse> {
    logger.debug('Request to create gallon', { tenantId: ctx.tenantId, tagCode: data.tagCode })

    // Rule: tag_code must be unique within the tenant
    const existingTag = await this.repository.findByTagCode(data.tagCode, ctx)
    if (existingTag) {
      throw new AppError(httpStatus.CONFLICT, `Gallon with tag code '${data.tagCode}' already exists`)
    }

    // Rule: serial_number must be unique within the tenant (if provided)
    if (data.serialNumber) {
      const existingSerial = await this.repository.findBySerialNumber(data.serialNumber, ctx)
      if (existingSerial) {
        throw new AppError(httpStatus.CONFLICT, `Gallon with serial number '${data.serialNumber}' already exists`)
      }
    }

    const created = await this.repository.create(data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'Gallon',
      entityId: created.id,
      afterData: created,
    })

    return GallonMapper.toResponse(created)
  }

  /**
   * Retrieve a single gallon by ID.
   *
   * @throws NotFoundError if the gallon does not exist or is soft-deleted.
   */
  async getGallon(id: string, ctx: GallonContext): Promise<GallonResponse> {
    logger.debug('Fetching gallon', { id, tenantId: ctx.tenantId })

    const gallon = await this.repository.findUnique(id, ctx)
    if (!gallon) {
      throw new NotFoundError('Gallon')
    }

    return GallonMapper.toResponse(gallon)
  }

  /**
   * Retrieve a paginated, filterable list of gallons.
   */
  async getGallons(query: GallonListQuery, ctx: GallonContext): Promise<GallonListResponse> {
    logger.debug('Listing gallons', {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
    })

    const { data, total } = await this.repository.findMany(query, ctx)
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 20, 100)

    return {
      data: data.map(GallonMapper.toResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Update a single gallon.
   *
   * Business rules:
   *  - If `status` is changed, validate the status transition against the
   *    lifecycle rules defined in VALID_STATUS_TRANSITIONS.
   *  - If `tag_code` is changed, ensure it remains unique within the tenant.
   *  - AuditLog entry with before/after recorded on success.
   *
   * @throws NotFoundError if the gallon does not exist.
   * @throws AppError(422)  if a status transition is invalid.
   * @throws AppError(409)  if the new tag_code is already in use.
   */
  async updateGallon(id: string, data: UpdateGallonRequest, ctx: GallonContext): Promise<GallonResponse> {
    logger.debug('Request to update gallon', { id, tenantId: ctx.tenantId })

    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Gallon')
    }

    // Rule: tag_code uniqueness (if being updated)
    if (data.tagCode !== undefined) {
      const conflicting = await this.repository.findByTagCode(data.tagCode, ctx, id)
      if (conflicting) {
        throw new AppError(httpStatus.CONFLICT, `Gallon with tag code '${data.tagCode}' already exists`)
      }
    }

    // Rule: status transition validation
    if (data.status !== undefined && data.status !== existing.status) {
      this.repository.validateStatusTransition(existing.status as ContainerStatus, data.status)
    }

    const updated = await this.repository.update(id, data, ctx)
    if (!updated) {
      throw new NotFoundError('Gallon')
    }

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Gallon',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    })

    return GallonMapper.toResponse(updated)
  }

  /**
   * Update the status of a gallon (e.g., move from IN_STOCK to WITH_CUSTOMER).
   *
   * Business rules:
   *  - Status transition must be valid per lifecycle rules.
   *  - Cannot transition FROM a terminal status (RETIRED, LOST).
   *  - AuditLog entry recorded on success.
   *
   * @throws NotFoundError if the gallon does not exist.
   * @throws AppError(422)  if the status transition is invalid.
   */
  async updateStatus(id: string, status: ContainerStatus, ctx: GallonContext, notes?: string): Promise<GallonResponse> {
    logger.debug('Request to update gallon status', { id, status, tenantId: ctx.tenantId })

    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Gallon')
    }

    const currentStatus = existing.status as ContainerStatus
    if (currentStatus === status) {
      throw new AppError(httpStatus.BAD_REQUEST, `Gallon is already in ${status} status`)
    }

    this.repository.validateStatusTransition(currentStatus, status)

    const updated = await this.repository.updateStatus(id, status, ctx, notes)
    if (!updated) {
      throw new NotFoundError('Gallon')
    }

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'STATUS_CHANGE',
      entityType: 'Gallon',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      notes,
    })

    return GallonMapper.toResponse(updated)
  }

  /**
   * Soft-delete a gallon.
   *
   * @throws NotFoundError if the gallon does not exist or is already deleted.
   */
  async deleteGallon(id: string, ctx: GallonContext): Promise<void> {
    logger.debug('Request to delete gallon', { id, tenantId: ctx.tenantId })

    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Gallon')
    }

    await this.repository.remove(id, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'Gallon',
      entityId: id,
      beforeData: existing,
    })
  }

  /**
   * Record an audit-log entry.
   * Mirrors the pattern in ProductService.logAudit.
   */
  private async logAudit(params: {
    tenantId: string
    userId: string
    action: string
    entityType: string
    entityId: string
    beforeData?: unknown
    afterData?: unknown
    notes?: string
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
        notes: params.notes ?? undefined,
      },
    })
  }

  /** Shallow-clone a value so mutable references are not shared with callers. */
  private deepClone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value))
  }
}

/** Shared service instance, mirroring ProductService pattern. */
export const gallonService = new GallonService(gallonRepository)
