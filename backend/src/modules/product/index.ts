/**
 * Barrel exports for the Product Management module.
 *
 * Import from the module root:
 *   import { productRoutes, productController, Product } from '@/modules/product'
 */

// Infrastructure / application layer
export { ProductRepository, productRepository } from './product.repository'
export { ProductService, productService } from './product.service'

// API layer
export { productController } from './product.controller'
export { productRoutes } from './product.routes'

// Types, schemas, permissions, and mappers
export * from './product.types'
export { ProductPermission, type ProductPermissionCode } from './product.permissions'
export * from './product.schema'
export { ProductMapper } from './product.mapper'
