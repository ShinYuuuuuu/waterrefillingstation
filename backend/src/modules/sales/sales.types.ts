/**
 * Type definitions for the Sales module.
 *
 * The `Sale` interface mirrors the `SalesTransaction` model in
 * backend/prisma/schema.prisma (snake_case DB columns).
 * API-facing types use camelCase per the project naming conventions
 * (AI_PROJECT_RULES.md §2.4).
 */

/** Sale lifecycle statuses — mirrors Prisma `SalesTransactionStatus`. */
export type SaleStatus = 'COMPLETED' | 'VOID' | 'REFUNDED' | 'HOLD'

/** Payment methods accepted by the station. */
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'ON_ACCOUNT'

/** Sales channels. */
export type SaleChannel = 'IN_STORE' | 'DELIVERY' | 'RESELLER'

// --- Database entities (snake_case, mirrors schema.prisma) ------------------

export interface Sale {
  id: string
  tenant_id: string
  branch_id: string
  customer_id: string | null
  invoice_number: string
  channel: SaleChannel
  status: SaleStatus
  subtotal: number
  discount_total: number
  tax_total: number
  grand_total: number
  amount_tendered: number | null
  change_amount: number | null
  void_reason: string | null
  voided_at: Date | null
  voided_by: string | null
  notes: string | null
  created_by: string
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  line_total: number
  is_refunded: boolean
  refunded_quantity: number
  created_at: Date
}

export interface SalePayment {
  id: string
  sale_id: string
  amount: number
  payment_method: PaymentMethod
  reference: string | null
  created_at: Date
}

// --- API request bodies (camelCase) -----------------------------------------

export interface CreateSaleRequest {
  customerId?: string | null
  channel: SaleChannel
  items: CreateSaleItemRequest[]
  payments: CreateSalePaymentRequest[]
  discountTotal?: number
  taxTotal?: number
  notes?: string | null
}

export interface CreateSaleItemRequest {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount?: number
}

export interface CreateSalePaymentRequest {
  amount: number
  method: PaymentMethod
  reference?: string | null
}

export interface UpdateSaleRequest {
  channel?: SaleChannel
  notes?: string | null
}

export interface RecordPaymentRequest {
  amount: number
  method: PaymentMethod
  reference?: string | null
}

export interface VoidSaleRequest {
  reason: string
  approvalPin?: string | null
}

// --- API response DTOs (camelCase) ------------------------------------------

export interface SaleResponse {
  id: string
  tenantId: string
  branchId: string
  customerId: string | null
  invoiceNumber: string
  channel: SaleChannel
  status: SaleStatus
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
  amountTendered: number | null
  changeAmount: number | null
  voidReason: string | null
  voidedAt: string | null
  voidedBy: string | null
  notes: string | null
  createdBy: string
  cashierName: string
  customerName: string
  createdAt: string
  updatedAt: string
  items: SaleItemResponse[]
  payments: SalePaymentResponse[]
}

export interface SaleItemResponse {
  id: string
  saleId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
  isRefunded: boolean
  refundedQuantity: number
  createdAt: string
}

export interface SalePaymentResponse {
  id: string
  saleId: string
  amount: number
  method: PaymentMethod
  reference: string | null
  createdAt: string
}

export interface SaleListResponse {
  data: SaleResponse[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface DailySummaryResponse {
  date: string
  totalSales: number
  totalTransactions: number
  totalItemsSold: number
  totalDiscount: number
  totalTax: number
  totalGrandTotal: number
  totalCash: number
  totalEwallet: number
  totalOnAccount: number
  byChannel: {
    inStore: number
    delivery: number
    reseller: number
  }
  byPaymentMethod: {
    cash: number
    gcash: number
    maya: number
    bankTransfer: number
    onAccount: number
  }
}

// --- Query / pagination / context -------------------------------------------

export interface SaleListQuery {
  page?: number
  limit?: number
  status?: string
  channel?: string
  customerId?: string
  startDate?: string
  endDate?: string
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'invoice_number' | 'grand_total'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Execution context passed from the controller to the service/repository.
 * `tenantId` and `userId` are always present after `authenticateToken()`.
 * `branchId` is present for branch-scoped users but absent for SUPER_ADMIN
 * and OWNER (HQ) users who operate across branches.
 */
export interface SaleContext {
  tenantId: string
  branchId: string | null
  userId: string
  userRole?: string
}
