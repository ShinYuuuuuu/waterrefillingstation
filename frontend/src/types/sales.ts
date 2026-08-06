export type SaleStatus = 'COMPLETED' | 'VOID' | 'REFUNDED' | 'HOLD'
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'ON_ACCOUNT'
export type SaleChannel = 'IN_STORE' | 'DELIVERY' | 'RESELLER'

export interface SaleItem {
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

export interface SalePayment {
  id: string
  saleId: string
  amount: number
  method: PaymentMethod
  reference: string | null
  createdAt: string
}

export interface Sale {
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
  createdAt: string
  updatedAt: string
  items: SaleItem[]
  payments: SalePayment[]
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

export interface CreateSaleRequest {
  customerId?: string | null
  channel: SaleChannel
  items: CreateSaleItemRequest[]
  payments: CreateSalePaymentRequest[]
  discountTotal?: number
  taxTotal?: number
  notes?: string | null
}

export interface SaleListQuery {
  page?: number
  limit?: number
  status?: string
  channel?: string
  customerId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface SaleListResponse {
  data: Sale[]
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
