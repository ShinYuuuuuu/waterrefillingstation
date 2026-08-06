import { z } from 'zod'
import { SaleChannel, SaleStatus, PaymentMethod } from './sales.types'

const SALE_CHANNEL_VALUES: [SaleChannel, ...SaleChannel[]] = ['IN_STORE', 'DELIVERY', 'RESELLER']
const saleChannelSchema = z.enum(SALE_CHANNEL_VALUES)

const SALE_STATUS_VALUES: [SaleStatus, ...SaleStatus[]] = ['COMPLETED', 'VOID', 'REFUNDED', 'HOLD']
const saleStatusSchema = z.enum(SALE_STATUS_VALUES)

const PAYMENT_METHOD_VALUES: [PaymentMethod, ...PaymentMethod[]] = ['CASH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'ON_ACCOUNT']
const paymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES)

/**
 * Reusable schema for numeric/decimal fields. The API accepts either a raw
 * number or a numeric string (clients frequently send decimals as strings to
 * avoid IEEE-754 float precision loss, per AI_PROJECT_RULES.md §4.1).
 */
const decimalField = z.union([z.number(), z.string()])

/**
 * Schema for a sale line item.
 */
const saleItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  productName: z.string().min(1, 'Product name is required').max(255),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: decimalField,
  discountAmount: decimalField.optional().default(0),
})

/**
 * Schema for a sale payment.
 */
const salePaymentSchema = z.object({
  amount: decimalField,
  method: paymentMethodSchema,
  reference: z.string().max(100).optional().nullable(),
})

/**
 * Body schema for `POST /sales`.
 * Validates the request body only (used with the `validateBody` middleware).
 */
export const createSaleSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional().nullable(),
  channel: saleChannelSchema,
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  payments: z.array(salePaymentSchema).min(1, 'At least one payment is required'),
  discountTotal: decimalField.optional().default(0),
  taxTotal: decimalField.optional().default(0),
  notes: z.string().max(1000).optional().nullable(),
})

/**
 * Body schema for `PUT /sales/:saleId`.
 * All fields optional — only provided fields are updated.
 */
export const updateSaleBodySchema = z.object({
  channel: saleChannelSchema.optional(),
  notes: z.string().max(1000).optional().nullable(),
})

/**
 * Combined schema for `PUT /sales/:saleId`.
 * Validates both the route param and the request body
 * (used with the `validateRequest` middleware).
 */
export const updateSaleSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('Invalid sale ID'),
  }),
  body: updateSaleBodySchema,
})

/**
 * Param-only schema for `GET /sales/:saleId` and
 * `DELETE /sales/:saleId`.
 */
export const saleIdSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('Invalid sale ID'),
  }),
})

/**
 * Param-only schema for `POST /sales/:saleId/payment` and
 * `POST /sales/:saleId/void` and `GET /sales/receipt/:saleId`.
 */
export const saleActionSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('Invalid sale ID'),
  }),
})

/**
 * Body schema for `POST /sales/:saleId/payment`.
 */
export const recordPaymentSchema = z.object({
  params: saleActionSchema.shape.params,
  body: z.object({
    amount: decimalField,
    method: paymentMethodSchema,
    reference: z.string().max(100).optional().nullable(),
  }),
})

/**
 * Body schema for `POST /sales/:saleId/void`.
 */
export const voidSaleSchema = z.object({
  params: saleActionSchema.shape.params,
  body: z.object({
    reason: z.string().min(1, 'Void reason is required').max(500),
    approvalPin: z.string().max(10).optional().nullable(),
  }),
})

/**
 * Query schema for `GET /sales`.
 */
export const saleListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: saleStatusSchema.optional(),
    channel: saleChannelSchema.optional(),
    customerId: z.string().uuid('Invalid customer ID').optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    search: z.string().optional(),
  }),
})

/**
 * Query schema for `GET /sales/daily-summary`.
 */
export const dailySummaryQuerySchema = z.object({
  query: z.object({
    date: z.string().datetime().optional(),
    branchId: z.string().uuid('Invalid branch ID').optional(),
  }),
})

/**
 * Param-only schema for `GET /sales/receipt/:saleId`.
 */
export const receiptSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('Invalid sale ID'),
  }),
})
