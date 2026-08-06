import { Router } from 'express'
import { authenticateToken, requirePermission } from '../../middleware/authJwt'
import { validateBody, validateRequest } from '../../middleware/validateRequest'
import { productController } from './product.controller'
import { ProductPermission } from './product.permissions'
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productListQuerySchema,
} from './product.schema'

/**
 * Express router for the Product Management module.
 *
 * All routes are mounted at /api/v1/products (registered in src/app.ts).
 * Every route requires a valid JWT and the appropriate RBAC permission.
 *
 * Route design follows docs/10-api-design.md §10.4:
 *   GET    /products           → list
 *   POST   /products           → create
 *   GET    /products/:productId → get one
 *   PUT    /products/:productId → update
 *   DELETE /products/:productId → soft-delete
 */
export const productRoutes = Router()

// Require a valid access token on every product route.
productRoutes.use(authenticateToken)

// GET /products — list with pagination, filtering, and sorting.
productRoutes.get(
  '/',
  requirePermission(ProductPermission.READ),
  validateRequest(productListQuerySchema),
  productController.list,
)

// POST /products — create a new product.
productRoutes.post(
  '/',
  requirePermission(ProductPermission.CREATE),
  validateBody(createProductSchema),
  productController.create,
)

// GET /products/:productId — retrieve a single product.
productRoutes.get(
  '/:productId',
  requirePermission(ProductPermission.READ),
  validateRequest(productIdSchema),
  productController.getOne,
)

// PUT /products/:productId — update product details.
productRoutes.put(
  '/:productId',
  requirePermission(ProductPermission.UPDATE),
  validateRequest(updateProductSchema),
  productController.update,
)

// DELETE /products/:productId — soft-delete (deactivates the product).
productRoutes.delete(
  '/:productId',
  requirePermission(ProductPermission.DELETE),
  validateRequest(productIdSchema),
  productController.remove,
)

export default productRoutes
