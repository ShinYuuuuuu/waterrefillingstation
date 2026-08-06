/**
 * Barrel exports for the Gallon Asset Management module.
 *
 * Import from the module root:
 *   import { gallonRoutes, gallonController, Gallon } from '@/modules/gallons'
 */

// Infrastructure / application layer
export { GallonRepository, gallonRepository } from './gallon.repository'
export { GallonService, gallonService } from './gallon.service'

// API layer
export { gallonController } from './gallon.controller'
export { gallonRoutes } from './gallon.routes'

// Types, schemas, permissions, and mappers
export * from './gallon.types'
export { GallonPermission, type GallonPermissionCode } from './gallon.permissions'
export * from './gallon.schema'
export { GallonMapper } from './gallon.mapper'
