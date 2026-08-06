import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { successResponse } from '../../utils/response'
import { gallonService } from './gallon.service'
import {
  CreateGallonRequest,
  UpdateGallonRequest,
  GallonListQuery,
  GallonContext,
} from './gallon.types'

/**
 * Thin controller for the Gallon Asset Management module.
 *
 * Controllers are intentionally minimal: they extract context from the
 * request, delegate all business logic to the service, and format the
 * HTTP response.  No business rules live here (AI_PROJECT_RULES.md §3.1).
 *
 * Validation is handled upstream by middleware (validateBody /
 * validateRequest), so req.validatedBody and req.validatedParams are
 * already typed-safe by the time the handler runs.
 */
export const gallonController = {
  /**
   * POST /gallons
   * Register a new gallon asset.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateGallonRequest

      const result = await gallonService.createGallon(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /gallons
   * Retrieve a paginated list of gallons.
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as GallonListQuery

      const result = await gallonService.getGallons(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /gallons/:gallonId
   * Retrieve a single gallon by ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { gallonId } = req.validatedParams as { gallonId: string }

      const result = await gallonService.getGallon(gallonId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /gallons/:gallonId
   * Update an existing gallon.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { gallonId } = req.validatedParams as { gallonId: string }
      const body = req.validatedBody as UpdateGallonRequest

      const result = await gallonService.updateGallon(gallonId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PATCH /gallons/:gallonId/status
   * Update a gallon's lifecycle status.
   */
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { gallonId } = req.validatedParams as { gallonId: string }
      const { status, notes } = req.validatedBody as { status: string; notes?: string }

      const result = await gallonService.updateStatus(gallonId, status as any, ctx, notes)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /gallons/:gallonId
   * Soft-delete a gallon.
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { gallonId } = req.validatedParams as { gallonId: string }

      await gallonService.deleteGallon(gallonId, ctx)
      return res.status(httpStatus.NO_CONTENT).json(successResponse({ message: 'Gallon deleted' }))
    } catch (error) {
      next(error)
    }
  },
}

/**
 * Extracts the authenticated user's tenant / branch / user context from
 * the request object.  These fields are populated by the authenticateToken
 * and tenantIsolation middleware.
 */
function buildContext(req: Request): GallonContext {
  const { tenantId, branchId, userId } = req

  if (!tenantId || !userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication required')
  }

  return {
    tenantId,
    branchId: branchId ?? null,
    userId,
  }
}
