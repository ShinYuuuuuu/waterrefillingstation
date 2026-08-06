import { Router } from 'express'
import { authenticateToken, requirePermission } from '../../middleware/authJwt'
import { validateBody, validateRequest } from '../../middleware/validateRequest'
import { saleController } from './sales.controller'
import { SalesPermission } from './sales.permissions'
import {
  createSaleSchema,
  updateSaleSchema,
  saleIdSchema,
  saleListQuerySchema,
  recordPaymentSchema,
  voidSaleSchema,
  dailySummaryQuerySchema,
  receiptSchema,
} from './sales.schema'

/**
 * Express router for the Sales module.
 *
 * All routes are mounted at /api/v1/sales (registered in src/app.ts).
 * Every route requires a valid JWT and the appropriate RBAC permission.
 *
 * Important: parameterized routes (e.g. /:saleId) must be defined AFTER
 * more specific routes (e.g. /daily-summary, /receipt/:saleId) so that
 * Express matches the literal path first.
 */
export const saleRoutes = Router()

// Require a valid access token on every sale route.
saleRoutes.use(authenticateToken)

// GET /sales — list with pagination, filtering, and branch scoping.
saleRoutes.get(
  '/',
  requirePermission(SalesPermission.READ),
  validateRequest(saleListQuerySchema),
  saleController.list,
)

// POST /sales — create a new sale.
saleRoutes.post(
  '/',
  requirePermission(SalesPermission.CREATE),
  validateBody(createSaleSchema),
  saleController.create,
)

// GET /sales/daily-summary — get daily sales summary.
saleRoutes.get(
  '/daily-summary',
  requirePermission(SalesPermission.READ),
  validateRequest(dailySummaryQuerySchema),
  saleController.dailySummary,
)

// GET /sales/receipt/:saleId — get sale receipt data.
saleRoutes.get(
  '/receipt/:saleId',
  requirePermission(SalesPermission.READ),
  validateRequest(receiptSchema),
  saleController.receipt,
)

// GET /sales/:saleId — retrieve a single sale.
saleRoutes.get(
  '/:saleId',
  requirePermission(SalesPermission.READ),
  validateRequest(saleIdSchema),
  saleController.getOne,
)

// PUT /sales/:saleId — update sale details.
saleRoutes.put(
  '/:saleId',
  requirePermission(SalesPermission.UPDATE),
  validateRequest(updateSaleSchema),
  saleController.update,
)

// DELETE /sales/:saleId — soft-delete a sale.
saleRoutes.delete(
  '/:saleId',
  requirePermission(SalesPermission.DELETE),
  validateRequest(saleIdSchema),
  saleController.remove,
)

// POST /sales/:saleId/payment — record a payment against a sale.
saleRoutes.post(
  '/:saleId/payment',
  requirePermission(SalesPermission.PAYMENT),
  validateRequest(recordPaymentSchema),
  saleController.recordPayment,
)

// POST /sales/:saleId/void — void a sale transaction.
saleRoutes.post(
  '/:saleId/void',
  requirePermission(SalesPermission.VOID),
  validateRequest(voidSaleSchema),
  saleController.voidSale,
)

export default saleRoutes
