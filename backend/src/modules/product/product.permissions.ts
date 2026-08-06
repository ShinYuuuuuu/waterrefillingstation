/**
 * RBAC permission constants for the Product Management module.
 *
 * Each code matches the `code` column (UNIQUE) on the `Permission` model in
 * schema.prisma and is consumed by the `requirePermission()` middleware
 * defined in src/middleware/authJwt.ts.
 *
 * Naming convention: `<module>.<action>`  (see AI_PROJECT_RULES.md §2.4).
 */
export const ProductPermission = {
  READ: 'products.read',
  CREATE: 'products.create',
  UPDATE: 'products.update',
  DELETE: 'products.delete',
} as const

/**
 * Union type of all product-module permission codes.
 */
export type ProductPermissionCode = (typeof ProductPermission)[keyof typeof ProductPermission]
