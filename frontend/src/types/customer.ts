import type { CustomerType } from '@/types'

/**
 * Frontend domain types for the Customer module.
 *
 * These mirror the camelCase API DTOs returned by the backend
 * (see backend/src/modules/customer/customer.types.ts), keeping the snake_case
 * database shape confined to the backend.
 */
export type { CustomerType }

export interface Customer {
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
  rewardPurchaseProgress: number
  rewardGallonProgress: number
  freeGallonsBalance: number
  status: string
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface CustomerListQuery {
  page?: number
  limit?: number
  customerType?: string
  status?: string
  search?: string
}

export interface CustomerListResponse {
  data: Customer[]
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

export interface CustomerSalesHistoryItem {
  id: string
  invoiceNumber: string
  date: string
  quantity: number
  amount: number
  channel: string
  paymentMethod: string | null
  paymentReference: string | null
}

export interface CustomerSalesHistoryResponse {
  data: CustomerSalesHistoryItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

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
