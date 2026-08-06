import { Gallon, GallonResponse, CreateGallonRequest, UpdateGallonRequest, GallonContext } from './gallon.types'

/**
 * Maps between the database entity (snake_case, Prisma output) and the
 * camelCase API DTOs.
 *
 * Keeping the mapping logic in a dedicated class ensures that controllers
 * never leak Prisma field names to the client and that write-input objects
 * never receive unrecognised camelCase fields.
 */
export class GallonMapper {
  /** DB entity → API response DTO */
  static toResponse(gallon: Gallon): GallonResponse {
    return {
      id: gallon.id,
      tenantId: gallon.tenant_id,
      branchId: gallon.branch_id,
      gallonTypeId: gallon.gallon_type_id,
      tagCode: gallon.tag_code,
      serialNumber: gallon.serial_number,
      status: gallon.status,
      currentHolderType: gallon.current_holder_type,
      currentHolderId: gallon.current_holder_id,
      currentCondition: gallon.current_condition,
      purchaseDate: gallon.purchase_date ? gallon.purchase_date.toISOString() : null,
      purchasePrice: gallon.purchase_price != null ? Number(gallon.purchase_price) : null,
      lastCleanedAt: gallon.last_cleaned_at ? gallon.last_cleaned_at.toISOString() : null,
      lastInspectedAt: gallon.last_inspected_at ? gallon.last_inspected_at.toISOString() : null,
      lastFilledAt: gallon.last_filled_at ? gallon.last_filled_at.toISOString() : null,
      totalFillCount: gallon.total_fill_count,
      totalCleanings: gallon.total_cleanings,
      isActive: gallon.is_active,
      createdAt: gallon.created_at.toISOString(),
      updatedAt: gallon.updated_at.toISOString(),
    }
  }

  /**
   * API create payload → Prisma write input (snake_case).
   * The `context` (tenant_id, branch_id, created_by) is injected by the service
   * layer; it must never come from the client.
   */
  static toCreateInput(data: CreateGallonRequest, context: GallonContext): Record<string, unknown> {
    return {
      tenant_id: context.tenantId,
      branch_id: context.branchId,
      gallon_type_id: data.gallonTypeId,
      tag_code: data.tagCode,
      serial_number: data.serialNumber ?? null,
      status: data.status ?? 'IN_STOCK',
      current_holder_type: data.holderType ?? null,
      current_holder_id: data.holderId ?? null,
      current_condition: data.condition ?? null,
      purchase_date: data.purchaseDate ?? null,
      purchase_price: data.purchasePrice != null ? Number(data.purchasePrice) : null,
      is_active: data.isActive ?? true,
    }
  }

  /**
   * API update payload → Prisma write input (snake_case).
   * Only provided fields are included; undefined values are omitted.
   */
  static toUpdateInput(data: UpdateGallonRequest): Record<string, unknown> {
    const input: Record<string, unknown> = { updated_at: new Date() }
    if (data.tagCode !== undefined) input.tag_code = data.tagCode
    if (data.serialNumber !== undefined) input.serial_number = data.serialNumber
    if (data.status !== undefined) input.status = data.status
    if (data.holderType !== undefined) input.current_holder_type = data.holderType
    if (data.holderId !== undefined) input.current_holder_id = data.holderId
    if (data.condition !== undefined) input.current_condition = data.condition
    if (data.purchasePrice !== undefined) input.purchase_price = data.purchasePrice != null ? Number(data.purchasePrice) : null
    if (data.isActive !== undefined) input.is_active = data.isActive
    if (data.metadata !== undefined) input.metadata = data.metadata
    return input
  }
}
