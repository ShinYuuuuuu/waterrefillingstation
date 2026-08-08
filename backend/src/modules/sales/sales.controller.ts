import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { successResponse } from '../../utils/response'
import { saleService } from './sales.service'
import {
  CreateSaleRequest,
  UpdateSaleRequest,
  SaleListQuery,
  RecordPaymentRequest,
  VoidSaleRequest,
  SaleContext,
} from './sales.types'

/**
 * Thin controller for the Sales module.
 *
 * Controllers are intentionally minimal: they extract context from the
 * request, delegate all business logic to the service, and format the
 * HTTP response. No business rules live here (AI_PROJECT_RULES.md §3.1).
 *
 * Validation is handled upstream by middleware (validateBody /
 * validateRequest), so req.validatedBody and req.validatedParams are
 * already typed-safe by the time the handler runs.
 */
export const saleController = {
  /**
   * POST /sales
   * Create a new sale transaction.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateSaleRequest

      const result = await saleService.createSale(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /sales
   * Retrieve a paginated list of sales.
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as SaleListQuery

      const result = await saleService.getSales(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /sales/:saleId
   * Retrieve a single sale by ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { saleId } = req.validatedParams as { saleId: string }

      const result = await saleService.getSale(saleId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /sales/:saleId
   * Update an existing sale.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { saleId } = req.validatedParams as { saleId: string }
      const body = req.validatedBody as UpdateSaleRequest

      const result = await saleService.updateSale(saleId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /sales/:saleId
   * Soft-delete a sale.
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { saleId } = req.validatedParams as { saleId: string }

      await saleService.deleteSale(saleId, ctx)
      return res.status(httpStatus.NO_CONTENT).json(successResponse({ message: 'Sale deleted' }))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /sales/:saleId/payment
   * Record a payment against a sale.
   */
  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { saleId } = req.validatedParams as { saleId: string }
      const body = req.validatedBody as RecordPaymentRequest

      await saleService.recordPayment(saleId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse({ message: 'Payment recorded' }))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /sales/:saleId/void
   * Void a sale transaction.
   */
  async voidSale(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { saleId } = req.validatedParams as { saleId: string }
      const body = req.validatedBody as VoidSaleRequest

      const result = await saleService.voidSale(saleId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /sales/daily-summary
   * Get daily sales summary.
   */
  async dailySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as { date?: string; branchId?: string }

      const result = await saleService.getDailySummary(query.date ?? new Date().toISOString(), query.branchId ?? null, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  async incomeTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await saleService.getIncomeTrends(buildContext(req))
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /sales/receipt/:saleId
   * Get sale receipt data.
   */
  async receipt(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { saleId } = req.validatedParams as { saleId: string }

      const result = await saleService.getSale(saleId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },
}

/**
 * Extracts the authenticated user's tenant / branch / user context from
 * the request object. These fields are populated by the authenticateToken
 * and tenantIsolation middleware.
 */
function buildContext(req: Request): SaleContext {
  const { tenantId, branchId, userId, userRole } = req

  if (!tenantId || !userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication required')
  }

  return {
    tenantId,
    branchId: branchId ?? null,
    userId,
    userRole,
  }
}
