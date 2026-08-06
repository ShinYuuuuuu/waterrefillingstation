/**
 * Barrel exports for the Inventory Management module.
 *
 * Import from the module root:
 *   import { inventoryRoutes, inventoryService } from '@/modules/inventory'
 */

// Infrastructure / application layer
export { InventoryRepository, inventoryRepository } from './inventory.repository'
export { InventoryService, inventoryService } from './inventory.service'

// API layer
export { inventoryController } from './inventory.controller'
export { inventoryRoutes } from './inventory.routes'

// Types, schemas, permissions, and mappers
export * from './inventory.types'
export { InventoryPermission, type InventoryPermissionCode } from './inventory.permissions'
export * from './inventory.schema'
export { InventoryMapper } from './inventory.mapper'
