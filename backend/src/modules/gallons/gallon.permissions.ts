/**
 * RBAC permission constants for the Gallon Asset Management module.
 *
 * Each code matches the `code` column (UNIQUE) on the `Permission` model in
 * schema.prisma and is consumed by the `requirePermission()` middleware
 * defined in src/middleware/authJwt.ts.
 *
 * Naming convention: `<module>.<action>`  (see AI_PROJECT_RULES.md §2.4).
 */
export const GallonPermission = {
  READ: 'gallons.read',
  CREATE: 'gallons.create',
  UPDATE: 'gallons.update',
  DELETE: 'gallons.delete',
} as const

/**
 * Union type of all gallon-module permission codes.
 */
export type GallonPermissionCode = (typeof GallonPermission)[keyof typeof GallonPermission]
