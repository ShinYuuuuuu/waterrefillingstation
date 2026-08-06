import { Product, ProductResponse, CreateProductRequest, UpdateProductRequest, ProductContext } from './product.types'

/**
 * Maps between the database entity (snake_case, Prisma output) and the
 * camelCase API DTOs.
 *
 * Keeping the mapping logic in a dedicated class ensures that controllers
 * never leak Prisma field names to the client and that write-input objects
 * never receive unrecognised camelCase fields.
 */
export class ProductMapper {
  /** DB entity → API response DTO */
  static toResponse(product: Product): ProductResponse {
    return {
      id: product.id,
      tenantId: product.tenant_id,
      categoryId: product.category_id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      type: product.type,
      unitOfMeasure: product.unit_of_measure,
      basePrice: Number(product.base_price),
      costPrice: Number(product.cost_price),
      isContainer: product.is_container,
      depositAmount: product.deposit_amount != null ? Number(product.deposit_amount) : null,
      reorderLevel: product.reorder_level,
      isActive: product.is_active,
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
      createdBy: product.created_by,
    }
  }

  /**
   * API create payload → Prisma write input (snake_case).
   * The `context` (tenant_id, created_by) is injected by the service layer;
   * it must never come from the client.
   */
  static toCreateInput(data: CreateProductRequest, context: ProductContext): Record<string, unknown> {
    return {
      tenant_id: context.tenantId,
      category_id: data.categoryId,
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      type: data.type,
      unit_of_measure: data.unitOfMeasure,
      base_price: data.basePrice,
      cost_price: data.costPrice,
      is_container: data.isContainer ?? false,
      deposit_amount: data.depositAmount,
      reorder_level: data.reorderLevel ?? 0,
      is_active: data.isActive ?? true,
      created_by: context.userId,
    }
  }

  /**
   * API update payload → Prisma write input (snake_case).
   * Only provided fields are included; undefined values are omitted.
   */
  static toUpdateInput(data: UpdateProductRequest): Record<string, unknown> {
    const input: Record<string, unknown> = { updated_at: new Date() }
    if (data.categoryId !== undefined) input.category_id = data.categoryId
    if (data.sku !== undefined) input.sku = data.sku
    if (data.name !== undefined) input.name = data.name
    if (data.description !== undefined) input.description = data.description
    if (data.type !== undefined) input.type = data.type
    if (data.unitOfMeasure !== undefined) input.unit_of_measure = data.unitOfMeasure
    if (data.basePrice !== undefined) input.base_price = data.basePrice
    if (data.costPrice !== undefined) input.cost_price = data.costPrice
    if (data.isContainer !== undefined) input.is_container = data.isContainer
    if (data.depositAmount !== undefined) input.deposit_amount = data.depositAmount
    if (data.reorderLevel !== undefined) input.reorder_level = data.reorderLevel
    if (data.isActive !== undefined) input.is_active = data.isActive
    if (data.metadata !== undefined) input.metadata = data.metadata
    return input
  }
}
