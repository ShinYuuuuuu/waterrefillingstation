import { z } from 'zod'
import { ContainerStatus } from './gallon.types'

/**
 * Zod validation schemas for the Gallon Asset Management module.
 *
 * Field names are camelCase per AI_PROJECT_RULES.md §2.4.
 */

/** Valid container status values matching the ContainerStatus enum in schema.prisma. */
export const ContainerStatusSchema = z.enum([
  'IN_STOCK',
  'WITH_CUSTOMER',
  'WITH_RIDER',
  'WITH_RESELLER',
  'DAMAGED',
  'LOST',
  'RETIRED',
  'CLEANING',
  'INSPECTION',
  'FILLED',
] as const)

const tagCodeSchema = z
  .string()
  .min(1, 'Tag code is required')
  .max(100, 'Tag code must be 100 characters or fewer')

const serialNumberSchema = z.string().max(100, 'Serial number must be 100 characters or fewer').optional().nullable()

const decimalField = z.union([z.number(), z.string()])

const purchasePriceSchema = decimalField.optional().nullable()

const conditionSchema = z.string().max(50, 'Condition must be 50 characters or fewer').optional().nullable()

const purchaseDateSchema = z.string().datetime({ offset: true }).optional().nullable()

const holderTypeSchema = z.string().max(50).optional().nullable()
const holderIdSchema = z.string().uuid('Holder ID must be a valid UUID').optional().nullable()

/**
 * Body schema for `POST /gallons`.
 */
export const createGallonSchema = z.object({
  gallonTypeId: z.string().uuid('Gallon type ID must be a valid UUID'),
  tagCode: tagCodeSchema,
  serialNumber: serialNumberSchema,
  status: ContainerStatusSchema.default('IN_STOCK'),
  holderType: holderTypeSchema,
  holderId: holderIdSchema,
  condition: conditionSchema,
  purchaseDate: purchaseDateSchema,
  purchasePrice: purchasePriceSchema,
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Body schema for `PUT /gallons/:gallonId`.
 * All fields optional — only provided fields are updated.
 */
export const updateGallonSchema = z.object({
  tagCode: tagCodeSchema.optional(),
  serialNumber: serialNumberSchema,
  status: ContainerStatusSchema.optional(),
  holderType: holderTypeSchema,
  holderId: holderIdSchema,
  condition: conditionSchema,
  purchasePrice: purchasePriceSchema,
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

/**
 * Combined schema for `PUT /gallons/:gallonId`.
 * Validates both the route param and the request body.
 */
export const gallonUpdateSchema = z.object({
  params: z.object({
    gallonId: z.string().uuid('Invalid gallon ID'),
  }),
  body: updateGallonSchema,
})

/**
 * Param-only schema for `GET /gallons/:gallonId` and `DELETE /gallons/:gallonId`.
 */
export const gallonIdSchema = z.object({
  params: z.object({
    gallonId: z.string().uuid('Invalid gallon ID'),
  }),
})

/**
 * Body schema for `PATCH /gallons/:gallonId/status`.
 */
export const gallonStatusBodySchema = z.object({
  status: ContainerStatusSchema,
  notes: z.string().max(500).optional().nullable(),
})

/**
 * Combined schema for `PATCH /gallons/:gallonId/status`.
 */
export const gallonStatusSchema = z.object({
  params: z.object({
    gallonId: z.string().uuid('Invalid gallon ID'),
  }),
  body: gallonStatusBodySchema,
})

/**
 * Query schema for `GET /gallons`.
 * Boolean query params use a preprocess to correctly handle "false" strings
 * (z.coerce.boolean() would treat "false" as truthy).
 */
function parseBool(val: unknown): boolean | undefined {
  if (val === undefined) return undefined
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') {
    if (val.toLowerCase() === 'false') return false
    if (val.toLowerCase() === 'true') return true
  }
  return Boolean(val)
}

export const gallonListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: ContainerStatusSchema.optional(),
    search: z.string().optional(),
    isActive: z.preprocess(parseBool, z.boolean().optional()),
    sortBy: z.enum(['created_at', 'updated_at', 'tag_code', 'status']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
})

export type { ContainerStatus }
