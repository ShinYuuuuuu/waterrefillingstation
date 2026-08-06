/**
 * Type definitions for the Gallon Asset Management module.
 *
 * The `Gallon` interface mirrors the `Gallon` model in
 * backend/prisma/schema.prisma (snake_case DB columns).
 * API-facing types use camelCase per the project naming conventions
 * (AI_PROJECT_RULES.md §2.4).
 */

/** Mirrors the ContainerStatus enum in schema.prisma. */
export type ContainerStatus =
  | 'IN_STOCK'
  | 'WITH_CUSTOMER'
  | 'WITH_RIDER'
  | 'WITH_RESELLER'
  | 'DAMAGED'
  | 'LOST'
  | 'RETIRED'
  | 'CLEANING'
  | 'INSPECTION'
  | 'FILLED'

/** Mirror of the `GallonType` model in DB. */
export type GallonType = {
  id: string
  tenant_id: string
  product_id: string
  name: string
  description: string | null
  capacity_liters: number | null
  material: string | null
  color: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

// --- Database entity (snake_case, mirrors schema.prisma → Gallon) ----------

export interface Gallon {
  id: string
  tenant_id: string
  branch_id: string
  gallon_type_id: string
  tag_code: string
  serial_number: string | null
  status: ContainerStatus
  current_holder_type: string | null
  current_holder_id: string | null
  current_condition: string | null
  purchase_date: Date | null
  purchase_price: number | null
  last_cleaned_at: Date | null
  last_inspected_at: Date | null
  last_filled_at: Date | null
  total_fill_count: number
  total_cleanings: number
  is_active: boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

// --- API request bodies (camelCase) -----------------------------------------

export interface CreateGallonRequest {
  gallonTypeId: string
  tagCode: string
  serialNumber?: string | null
  status?: ContainerStatus
  holderType?: string | null
  holderId?: string | null
  condition?: string | null
  purchaseDate?: string | null
  purchasePrice?: number | string | null
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateGallonRequest {
  tagCode?: string
  serialNumber?: string | null
  status?: ContainerStatus
  holderType?: string | null
  holderId?: string | null
  condition?: string | null
  purchasePrice?: number | string | null
  isActive?: boolean
  metadata?: Record<string, unknown> | null
}

// --- API response DTOs (camelCase) ------------------------------------------

export interface GallonResponse {
  id: string
  tenantId: string
  branchId: string
  gallonTypeId: string
  tagCode: string
  serialNumber: string | null
  status: ContainerStatus
  currentHolderType: string | null
  currentHolderId: string | null
  currentCondition: string | null
  purchaseDate: string | null
  purchasePrice: number | null
  lastCleanedAt: string | null
  lastInspectedAt: string | null
  lastFilledAt: string | null
  totalFillCount: number
  totalCleanings: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GallonListResponse {
  data: GallonResponse[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// --- Query / pagination / context -------------------------------------------

export interface GallonListQuery {
  page?: number
  limit?: number
  status?: string
  search?: string
  isActive?: boolean
  sortBy?: 'created_at' | 'updated_at' | 'tag_code' | 'status'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Execution context passed from the controller to the service/repository.
 * `tenantId` and `userId` are always present after `authenticateToken()`.
 * `branchId` is present for branch-scoped users but absent for SUPER_ADMIN
 * and OWNER (HQ) users who operate across branches.
 */
export interface GallonContext {
  tenantId: string
  branchId: string | null
  userId: string
}

/**
 * Valid status transitions for a gallon asset.
 * Used by lifecycle validation in the service layer.
 */
export const VALID_STATUS_TRANSITIONS: Record<ContainerStatus, ContainerStatus[]> = {
  IN_STOCK: ['WITH_CUSTOMER', 'WITH_RIDER', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED', 'CLEANING', 'INSPECTION', 'FILLED'],
  WITH_CUSTOMER: ['IN_STOCK', 'WITH_RIDER', 'DAMAGED', 'LOST', 'RETIRED'],
  WITH_RIDER: ['IN_STOCK', 'WITH_CUSTOMER', 'DAMAGED', 'LOST', 'RETIRED'],
  WITH_RESELLER: ['IN_STOCK', 'WITH_RESELLER', 'DAMAGED', 'LOST', 'RETIRED'],
  DAMAGED: ['IN_STOCK', 'CLEANING', 'RETIRED', 'LOST'],
  LOST: ['RETIRED'],
  RETIRED: [],
  CLEANING: ['IN_STOCK', 'INSPECTION'],
  INSPECTION: ['IN_STOCK', 'CLEANING', 'DAMAGED', 'FILLED'],
  FILLED: ['IN_STOCK', 'WITH_CUSTOMER'],
}

/** Terminal (irreversible) statuses — once entered, the gallon cannot leave. */
export const TERMINAL_STATUSES: ContainerStatus[] = ['RETIRED', 'LOST']
