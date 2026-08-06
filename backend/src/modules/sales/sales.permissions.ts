/**
 * RBAC permission constants for the Sales module.
 *
 * Each code matches the `code` column (UNIQUE) on the `Permission` model in
 * schema.prisma and is consumed by the `requirePermission()` middleware
 * defined in src/middleware/authJwt.ts.
 *
 * Naming convention: `<module>.<action>`  (see AI_PROJECT_RULES.md §2.4).
 */
export const SalesPermission = {
  READ: 'sales.read',
  CREATE: 'sales.create',
  UPDATE: 'sales.update',
  DELETE: 'sales.delete',
  VOID: 'sales.void',
  PAYMENT: 'sales.payment',
} as const

/**
 * Union type of all sales-module permission codes, useful for
 * type-safe permission checks elsewhere in the codebase.
 */
export type SalesPermissionCode = (typeof SalesPermission)[keyof typeof SalesPermission]
