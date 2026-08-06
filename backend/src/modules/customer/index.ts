/**
 * Barrel exports for the Customer Management module.
 *
 * Import from the module root:
 *   import { customerRoutes, customerController, Customer } from '@/modules/customer'
 */

// Infrastructure / application layer
export { CustomerRepository, customerRepository } from './customer.repository'
export { CustomerService, customerService } from './customer.service'

// API layer
export { customerController } from './customer.controller'
export { customerRoutes } from './customer.routes'

// Types, schemas, permissions, and mappers
export * from './customer.types'
export { CustomerPermission, type CustomerPermissionCode } from './customer.permissions'
export * from './customer.schema'
export { CustomerMapper } from './customer.mapper'
