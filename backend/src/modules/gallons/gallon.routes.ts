import { Router } from 'express'
import { authenticateToken, requirePermission } from '../../middleware/authJwt'
import { validateBody, validateRequest } from '../../middleware/validateRequest'
import { gallonController } from './gallon.controller'
import { GallonPermission } from './gallon.permissions'
import {
  createGallonSchema,
  gallonUpdateSchema,
  gallonIdSchema,
  gallonListQuerySchema,
  gallonStatusSchema,
} from './gallon.schema'

/**
 * Express router for the Gallon Asset Management module.
 *
 * All routes are mounted at /api/v1/gallons (registered in src/app.ts).
 * Every route requires a valid JWT and the appropriate RBAC permission.
 *
 * Route design follows docs/10-api-design.md §10.2:
 *   GET    /gallons                → list
 *   POST   /gallons                → register
 *   GET    /gallons/:gallonId      → get one
 *   PUT    /gallons/:gallonId      → update
 *   PATCH  /gallons/:gallonId/status → update status
 *   DELETE /gallons/:gallonId      → soft-delete
 */
export const gallonRoutes = Router()

// Require a valid access token on every gallon route.
gallonRoutes.use(authenticateToken)

// GET /gallons — list with pagination, filtering, and sorting.
gallonRoutes.get(
  '/',
  requirePermission(GallonPermission.READ),
  validateRequest(gallonListQuerySchema),
  gallonController.list,
)

// POST /gallons — register a new gallon asset.
gallonRoutes.post(
  '/',
  requirePermission(GallonPermission.CREATE),
  validateBody(createGallonSchema),
  gallonController.create,
)

// GET /gallons/:gallonId — retrieve a single gallon.
gallonRoutes.get(
  '/:gallonId',
  requirePermission(GallonPermission.READ),
  validateRequest(gallonIdSchema),
  gallonController.getOne,
)

// PUT /gallons/:gallonId — update gallon details.
gallonRoutes.put(
  '/:gallonId',
  requirePermission(GallonPermission.UPDATE),
  validateRequest(gallonUpdateSchema),
  gallonController.update,
)

// PATCH /gallons/:gallonId/status — update lifecycle status.
gallonRoutes.patch(
  '/:gallonId/status',
  requirePermission(GallonPermission.UPDATE),
  validateRequest(gallonStatusSchema),
  gallonController.updateStatus,
)

// DELETE /gallons/:gallonId — soft-delete (retires the gallon).
gallonRoutes.delete(
  '/:gallonId',
  requirePermission(GallonPermission.DELETE),
  validateRequest(gallonIdSchema),
  gallonController.remove,
)

export default gallonRoutes
