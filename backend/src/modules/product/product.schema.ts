import { z } from 'zod'
import { ProductType } from './product.types'

const PRODUCT_TYPE_VALUES: [ProductType, ...ProductType[]] = [
  'FINISHED_GOOD',
  'RAW_MATERIAL',
  'CONTAINER',
  'ACCESSORY',
  'SERVICE',
]
const productTypeSchema = z.enum(PRODUCT_TYPE_VALUES)

/**
 * Reusable schema for numeric/decimal fields.  The API accepts either a raw
 * number or a numeric string (clients frequently send decimals as strings to
 * avoid IEEE-754 float precision loss, per AI_PROJECT_RULES.md §4.1).
 */
const decimalField = z.union([z.number(), z.string()])

/**
 * Body schema for `POST /products`.
 * Validates the request body only (used with the `validateBody` middleware).
 */
export const createProductSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional().nullable(),
  type: productTypeSchema,
  unitOfMeasure: z.string().min(1, 'Unit of measure is required').max(20),
  basePrice: decimalField,
  costPrice: decimalField,
  isContainer: z.boolean().default(false),
  depositAmount: decimalField.optional().nullable(),
  reorderLevel: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Body schema for `PUT /products/:productId`.
 * All fields optional — only provided fields are updated.
 */
export const updateProductBodySchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  sku: z.string().min(1, 'SKU is required').max(50).optional(),
  name: z.string().min(1, 'Product name is required').max(255).optional(),
  description: z.string().optional().nullable(),
  type: productTypeSchema.optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required').max(20).optional(),
  basePrice: decimalField.optional(),
  costPrice: decimalField.optional(),
  isContainer: z.boolean().optional(),
  depositAmount: decimalField.optional().nullable(),
  reorderLevel: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

/**
 * Combined schema for `PUT /products/:productId`.
 * Validates both the route param and the request body
 * (used with the `validateRequest` middleware).
 */
export const updateProductSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  body: updateProductBodySchema,
})

/**
 * Param-only schema for `GET /products/:productId` and
 * `DELETE /products/:productId`.
 */
export const productIdSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
})

/**
 * Query schema for `GET /products`.
 */
export const productListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    category: z.string().uuid('Invalid category ID').optional(),
    type: productTypeSchema.optional(),
    isActive: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'false') return false
      if (val.toLowerCase() === 'true') return true
    }
    return Boolean(val)
  }, z.boolean()).optional(),
    search: z.string().optional(),
    isContainer: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.toLowerCase() === 'false') return false
      if (val.toLowerCase() === 'true') return true
    }
    return Boolean(val)
  }, z.boolean()).optional(),
  }),
})
