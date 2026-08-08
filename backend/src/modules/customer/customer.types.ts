/**
 * Type definitions for the Customer Management module.
 *
 * The `Customer` interface mirrors the `Customer` model in
 * backend/prisma/schema.prisma (snake_case DB columns).
 * API-facing types use camelCase per the project naming conventions
 * (AI_PROJECT_RULES.md §2.4).
 */

/** Mirrors the CustomerType enum in schema.prisma. */
export type CustomerType = 'RETAIL' | 'RESELLER' | 'CORPORATE'

// --- Database entity (snake_case, mirrors schema.prisma → Customer) ----------

export interface Customer {
  id: string
  tenant_id: string
  branch_id: string
  customer_type: CustomerType
  full_name: string
  company_name: string | null
  phone: string
  email: string | null
  tin: string | null
  credit_limit: number
  current_balance: number
  loyalty_points: number
  loyalty_tier: string | null
  status: string
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
  created_by: string | null
}

// --- API request bodies (camelCase) -----------------------------------------

export interface CreateCustomerRequest {
  customerType?: CustomerType
  fullName: string
  companyName?: string | null
  phone: string
  email?: string | null
  tin?: string | null
  creditLimit?: number | string
  metadata?: Record<string, unknown>
}

export interface UpdateCustomerRequest {
  customerType?: CustomerType
  fullName?: string
  companyName?: string | null
  phone?: string
  email?: string | null
  tin?: string | null
  creditLimit?: number | string
  currentBalance?: number | string
  loyaltyPoints?: number
  loyaltyTier?: string | null
  status?: string
  metadata?: Record<string, unknown> | null
}

// --- API response DTOs (camelCase) ------------------------------------------

export interface CustomerResponse {
  id: string
  tenantId: string
  branchId: string
  customerType: CustomerType
  fullName: string
  companyName: string | null
  phone: string
  email: string | null
  tin: string | null
  creditLimit: number
  currentBalance: number
  loyaltyPoints: number
  loyaltyTier: string | null
  status: string
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface CustomerListResponse {
  data: CustomerResponse[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CustomerPurchaseSummary {
  customerId: string
  totalPurchases: number
  totalGallons: number
  totalSpent: number
  lastPurchase: string | null
}

export interface CustomerSalesHistoryResponse {
  data: {
    id: string
    invoiceNumber: string
    date: string
    quantity: number
    amount: number
    channel: string
    paymentMethod: string | null
    paymentReference: string | null
  }[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// --- Query / pagination / context -------------------------------------------

export interface CustomerListQuery {
  page?: number
  limit?: number
  customerType?: string
  status?: string
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'full_name' | 'loyalty_points'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Execution context passed from the controller to the service/repository.
 * `tenantId` and `userId` are always present after `authenticateToken()`.
 * `branchId` is present for branch-scoped users but absent for SUPER_ADMIN
 * and OWNER (HQ) users who operate across branches.
 */
export interface CustomerContext {
  tenantId: string
  branchId: string | null
  userId: string
}
