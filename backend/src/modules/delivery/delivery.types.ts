/**
 * Type definitions for the Delivery module.
 *
 * API-facing types use camelCase per the project naming conventions.
 */

export type DeliveryOrderStatus = 'PENDING' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELLED'
export type DeliveryOrderType = 'ONE_TIME' | 'STANDING'
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER' | 'CARD' | 'CHECK' | 'CREDIT'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECONCILED' | 'DISPUTED' | 'FAILED'

export interface DeliveryOrderItem {
  id: string
  deliveryOrderId: string
  productId: string
  productName?: string
  productSku?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  createdAt: string
}

export interface DeliveryOrder {
  id: string
  tenantId: string
  branchId: string
  customerId: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  addressId: string | null
  addressLine: string | null
  orderType: DeliveryOrderType
  standingOrderId: string | null
  requestedDate: string | null
  requestedTimeSlot: string | null
  status: DeliveryOrderStatus
  assignedRiderId: string | null
  assignedRiderName?: string | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  salesTransactionId: string | null
  failureReason: string | null
  proofPhotoUrl: string | null
  proofSignatureUrl: string | null
  specialInstructions: string | null
  deliveredAt: string | null
  createdAt: string
  updatedAt: string
  items: DeliveryOrderItem[]
}

export interface DeliveryOrderListResponse {
  data: DeliveryOrder[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateDeliveryOrderRequest {
  customerId: string
  addressId?: string | null
  orderType?: DeliveryOrderType
  standingOrderId?: string | null
  requestedDate?: string | null
  requestedTimeSlot?: string | null
  paymentMethod?: PaymentMethod | null
  paymentStatus?: PaymentStatus | null
  salesTransactionId?: string | null
  specialInstructions?: string | null
  riderId?: string | null
  items: CreateDeliveryOrderItemRequest[]
}

export interface CreateDeliveryOrderItemRequest {
  productId: string
  productName: string
  productSku?: string | null
  quantity: number
  unitPrice: number
}

export interface UpdateDeliveryOrderRequest {
  addressId?: string | null
  requestedDate?: string | null
  requestedTimeSlot?: string | null
  paymentMethod?: PaymentMethod | null
  paymentStatus?: PaymentStatus | null
  specialInstructions?: string | null
  failureReason?: string | null
  proofPhotoUrl?: string | null
  proofSignatureUrl?: string | null
}

export interface UpdateDeliveryOrderStatusRequest {
  status: DeliveryOrderStatus
  failureReason?: string | null
  proofPhotoUrl?: string | null
  proofSignatureUrl?: string | null
}

export interface AssignRiderRequest {
  riderId: string
}

export interface DeliveryOrderListQuery {
  page?: number
  limit?: number
  status?: DeliveryOrderStatus
  customerId?: string
  assignedRiderId?: string
  startDate?: string
  endDate?: string
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'requested_date' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export interface DeliveryContext {
  tenantId: string
  branchId: string | null
  userId: string
  userRole: string
}

export const VALID_DELIVERY_STATUS_TRANSITIONS: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['OUT_FOR_DELIVERY', 'CANCELLED', 'PENDING'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  FAILED: ['PENDING', 'CANCELLED'],
  RETURNED: ['CANCELLED'],
  CANCELLED: [],
}
