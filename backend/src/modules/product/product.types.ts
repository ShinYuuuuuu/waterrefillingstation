/**
 * Type definitions for the Product Management module.
 *
 * The `Product` interface mirrors the `Product` model in
 * backend/prisma/schema.prisma (snake_case DB columns).
 * API-facing types use camelCase per the project naming conventions
 * (AI_PROJECT_RULES.md §2.4).
 *
 * Note: Unlike Customer, the Product model has no `branch_id` column —
 * products are defined at the tenant level.  Branch-level stock is
 * tracked separately via the `BranchInventory` model.
 */

/** Mirrors the ProductType enum in schema.prisma. */
export type ProductType = 'FINISHED_GOOD' | 'RAW_MATERIAL' | 'CONTAINER' | 'ACCESSORY' | 'SERVICE'

// --- Database entity (snake_case, mirrors schema.prisma → Product) ----------

export interface Product {
  id: string
  tenant_id: string
  category_id: string
  sku: string
  name: string
  description: string | null
  type: ProductType
  unit_of_measure: string
  base_price: number
  cost_price: number
  is_container: boolean
  deposit_amount: number | null
  reorder_level: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  created_by: string | null
}

// --- API request bodies (camelCase) -----------------------------------------

export interface CreateProductRequest {
  categoryId: string
  sku: string
  name: string
  description?: string | null
  type: ProductType
  unitOfMeasure: string
  basePrice: number | string
  costPrice: number | string
  isContainer?: boolean
  depositAmount?: number | string | null
  reorderLevel?: number
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateProductRequest {
  categoryId?: string
  sku?: string
  name?: string
  description?: string | null
  type?: ProductType
  unitOfMeasure?: string
  basePrice?: number | string
  costPrice?: number | string
  isContainer?: boolean
  depositAmount?: number | string | null
  reorderLevel?: number
  isActive?: boolean
  metadata?: Record<string, unknown>
}

// --- API response DTOs (camelCase) ------------------------------------------

export interface ProductResponse {
  id: string
  tenantId: string
  categoryId: string
  sku: string
  name: string
  description: string | null
  type: ProductType
  unitOfMeasure: string
  basePrice: number
  costPrice: number
  isContainer: boolean
  depositAmount: number | null
  reorderLevel: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface ProductListResponse {
  data: ProductResponse[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// --- Query / pagination / context -------------------------------------------

export interface ProductListQuery {
  page?: number
  limit?: number
  category?: string
  type?: string
  isActive?: boolean
  search?: string
  isContainer?: boolean
  sortBy?: 'created_at' | 'updated_at' | 'name' | 'sku'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Execution context passed from the controller to the service/repository.
 * `tenantId` and `userId` are always present after `authenticateToken()`.
 * `branchId` is present for branch-scoped users but absent for SUPER_ADMIN
 * and OWNER (HQ) users who operate across branches.
 */
export interface ProductContext {
  tenantId: string
  branchId: string | null
  userId: string
}
