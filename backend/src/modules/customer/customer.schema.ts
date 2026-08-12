import { z } from 'zod'
import { CustomerType } from './customer.types'

const CUSTOMER_TYPE_VALUES: [CustomerType, ...CustomerType[]] = ['RETAIL', 'RESELLER', 'CORPORATE']
const customerTypeSchema = z.enum(CUSTOMER_TYPE_VALUES)

/**
 * Reusable schema for numeric/decimal fields.  The API accepts either a raw
 * number or a numeric string (clients frequently send decimals as strings to
 * avoid IEEE-754 float precision loss, per AI_PROJECT_RULES.md §4.1).
 */
const decimalField = z.union([z.number(), z.string()])

/**
 * Body schema for `POST /customers`.
 * Validates the request body only (used with the `validateBody` middleware).
 */
export const createCustomerSchema = z.object({
  customerType: customerTypeSchema.default('RETAIL'),
  fullName: z.string().min(1, 'Full name is required').max(255),
  companyName: z.string().max(255).optional().nullable(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  tin: z.string().max(50).optional().nullable(),
  creditLimit: decimalField.optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Body schema for `PUT /customers/:customerId`.
 * All fields optional — only provided fields are updated.
 */
export const updateCustomerBodySchema = z.object({
  customerType: customerTypeSchema.optional(),
  fullName: z.string().min(1, 'Full name is required').max(255).optional(),
  companyName: z.string().max(255).optional().nullable(),
  phone: z.string().min(1, 'Phone number is required').max(30).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  tin: z.string().max(50).optional().nullable(),
  creditLimit: decimalField.optional(),
  currentBalance: decimalField.optional(),
  loyaltyPoints: z.number().int().nonnegative().optional(),
  loyaltyTier: z.string().max(50).optional().nullable(),
  status: z.string().max(20).optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

/**
 * Combined schema for `PUT /customers/:customerId`.
 * Validates both the route param and the request body
 * (used with the `validateRequest` middleware).
 */
export const updateCustomerSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
  }),
  body: updateCustomerBodySchema,
})

/**
 * Param-only schema for `GET /customers/:customerId` and
 * `DELETE /customers/:customerId`.
 */
export const customerIdSchema = z.object({
  params: z.object({
    customerId: z.string().uuid('Invalid customer ID'),
  }),
})

/**
 * Query schema for `GET /customers`.
 */
export const customerListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    customerType: customerTypeSchema.optional(),
    status: z.string().optional(),
    search: z.string().optional(),
  }),
})

/**
 * Query schema for customer purchase history endpoints.
 */
export const customerPurchaseQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
})
