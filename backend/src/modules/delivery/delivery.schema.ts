import { z } from 'zod'
import { DeliveryOrderStatus, DeliveryOrderType, PaymentMethod, PaymentStatus } from './delivery.types'

const deliveryOrderTypeSchema = z.enum(['ONE_TIME', 'STANDING'] as const)
const deliveryOrderStatusSchema = z.enum(['PENDING', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED'] as const)
const paymentMethodSchema = z.enum(['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'CARD', 'CHECK', 'CREDIT'] as const)
const paymentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'RECONCILED', 'DISPUTED', 'FAILED'] as const)

export const deliveryOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  productName: z.string().min(1, 'Product name is required').max(255),
  productSku: z.string().max(100).optional().nullable(),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
})

export const createDeliveryOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  addressId: z.string().uuid('Invalid address ID').optional().nullable(),
  orderType: deliveryOrderTypeSchema.default('ONE_TIME'),
  standingOrderId: z.string().uuid('Invalid standing order ID').optional().nullable(),
  requestedDate: z.string().datetime().optional().nullable(),
  requestedTimeSlot: z.string().max(50).optional().nullable(),
  paymentMethod: paymentMethodSchema.optional().nullable(),
  paymentStatus: paymentStatusSchema.default('PENDING'),
  salesTransactionId: z.string().uuid('Invalid sales transaction ID').optional().nullable(),
  specialInstructions: z.string().max(1000).optional().nullable(),
  riderId: z.string().uuid('Invalid rider ID').optional().nullable(),
  items: z.array(deliveryOrderItemSchema).min(1, 'At least one item is required'),
})

export const updateDeliveryOrderSchema = z.object({
  params: z.object({
    deliveryOrderId: z.string().uuid('Invalid delivery order ID'),
  }),
  body: z.object({
    addressId: z.string().uuid('Invalid address ID').optional().nullable(),
    requestedDate: z.string().datetime().optional().nullable(),
    requestedTimeSlot: z.string().max(50).optional().nullable(),
    paymentMethod: paymentMethodSchema.optional().nullable(),
    paymentStatus: paymentStatusSchema.optional().nullable(),
    specialInstructions: z.string().max(1000).optional().nullable(),
    failureReason: z.string().max(500).optional().nullable(),
    proofPhotoUrl: z.string().url().optional().nullable(),
    proofSignatureUrl: z.string().url().optional().nullable(),
  }),
})

export const deliveryOrderIdSchema = z.object({
  params: z.object({
    deliveryOrderId: z.string().uuid('Invalid delivery order ID'),
  }),
})

export const updateDeliveryOrderStatusSchema = z.object({
  params: z.object({
    deliveryOrderId: z.string().uuid('Invalid delivery order ID'),
  }),
  body: z.object({
    status: deliveryOrderStatusSchema,
    failureReason: z.string().max(500).optional().nullable(),
    proofPhotoUrl: z.string().url().optional().nullable(),
    proofSignatureUrl: z.string().url().optional().nullable(),
  }),
})

export const assignRiderSchema = z.object({
  params: z.object({
    deliveryOrderId: z.string().uuid('Invalid delivery order ID'),
  }),
  body: z.object({
    riderId: z.string().uuid('Invalid rider ID'),
  }),
})

export const deliveryOrderListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: deliveryOrderStatusSchema.optional(),
    customerId: z.string().uuid('Invalid customer ID').optional(),
    assignedRiderId: z.string().uuid('Invalid rider ID').optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['created_at', 'updated_at', 'requested_date', 'status']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
})

export const riderListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    isActive: z.preprocess((val) => {
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'false') return false
        if (val.toLowerCase() === 'true') return true
      }
      return Boolean(val)
    }, z.boolean()).optional(),
  }),
})
