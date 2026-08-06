/**
 * Barrel exports for the Sales module.
 *
 * Import from the module root:
 *   import { saleRoutes, saleController, Sale } from '@/modules/sales'
 */

// Infrastructure / application layer
export { SaleRepository, saleRepository } from './sales.repository'
export { SaleService, saleService } from './sales.service'

// API layer
export { saleController } from './sales.controller'
export { saleRoutes } from './sales.routes'

// Types, schemas, permissions, and mappers
export * from './sales.types'
export { SalesPermission, type SalesPermissionCode } from './sales.permissions'
export * from './sales.schema'
export { SaleMapper } from './sales.mapper'
