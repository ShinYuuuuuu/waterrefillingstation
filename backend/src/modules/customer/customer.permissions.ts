/**
 * RBAC permission constants for the Customer Management module.
 *
 * Each code matches the `code` column (UNIQUE) on the `Permission` model in
 * schema.prisma and is consumed by the `requirePermission()` middleware
 * defined in src/middleware/authJwt.ts.
 *
 * Naming convention: `<module>.<action>`  (see AI_PROJECT_RULES.md §2.4).
 */
export const CustomerPermission = {
  READ: 'customers.read',
  CREATE: 'customers.create',
  UPDATE: 'customers.update',
  DELETE: 'customers.delete',
} as const

/**
 * Union type of all customer-module permission codes, useful for
 * type-safe permission checks elsewhere in the codebase.
 */
export type CustomerPermissionCode = (typeof CustomerPermission)[keyof typeof CustomerPermission]
