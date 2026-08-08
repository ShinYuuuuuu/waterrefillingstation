import { Router } from 'express'
import { authenticateToken, requirePermission } from '../../middleware/authJwt'
import { validateBody, validateRequest } from '../../middleware/validateRequest'
import { customerController } from './customer.controller'
import { CustomerPermission } from './customer.permissions'
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
  customerListQuerySchema,
  customerPurchaseQuerySchema,
} from './customer.schema'

/**
 * Express router for the Customer Management module.
 *
 * All routes are mounted at /api/v1/customers (registered in src/app.ts).
 * Every route requires a valid JWT and the appropriate RBAC permission.
 *
 * Route design follows docs/10-api-design.md §10.5:
 *   GET    /customers          → list
 *   POST   /customers          → create
 *   GET    /customers/:customerId  → get one
 *   PUT    /customers/:customerId  → update
 *   DELETE /customers/:customerId  → soft-delete
 */
export const customerRoutes = Router()

// Require a valid access token on every customer route.
customerRoutes.use(authenticateToken)

// GET /customers — list with pagination, filtering, and branch scoping.
customerRoutes.get(
  '/',
  requirePermission(CustomerPermission.READ),
  validateRequest(customerListQuerySchema),
  customerController.list,
)

// POST /customers — create a new customer.
customerRoutes.post(
  '/',
  requirePermission(CustomerPermission.CREATE),
  validateBody(createCustomerSchema),
  customerController.create,
)

// GET /customers/:customerId — retrieve a single customer.
customerRoutes.get(
  '/:customerId',
  requirePermission(CustomerPermission.READ),
  validateRequest(customerIdSchema),
  customerController.getOne,
)

// GET /customers/:customerId/purchase-summary — retrieve purchase summary.
customerRoutes.get(
  '/:customerId/purchase-summary',
  requirePermission(CustomerPermission.READ),
  validateRequest(customerIdSchema),
  customerController.getPurchaseSummary,
)

// GET /customers/:customerId/sales — retrieve customer sales history.
customerRoutes.get(
  '/:customerId/sales',
  requirePermission(CustomerPermission.READ),
  validateRequest(customerIdSchema),
  validateRequest(customerPurchaseQuerySchema),
  customerController.getSalesHistory,
)

// PUT /customers/:customerId — update customer details.
customerRoutes.put(
  '/:customerId',
  requirePermission(CustomerPermission.UPDATE),
  validateRequest(updateCustomerSchema),
  customerController.update,
)

// DELETE /customers/:customerId — soft-delete (deactivates the customer).
customerRoutes.delete(
  '/:customerId',
  requirePermission(CustomerPermission.DELETE),
  validateRequest(customerIdSchema),
  customerController.remove,
)

export default customerRoutes
