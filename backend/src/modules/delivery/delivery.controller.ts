import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { successResponse } from '../../utils/response'
import { deliveryService } from './delivery.service'
import {
  DeliveryContext,
  DeliveryOrderListQuery,
  CreateDeliveryOrderRequest,
  UpdateDeliveryOrderRequest,
  UpdateDeliveryOrderStatusRequest,
  AssignRiderRequest,
} from './delivery.types'

export const deliveryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as DeliveryOrderListQuery
      const result = await deliveryService.getDeliveryOrders(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }))
    } catch (error) {
      next(error)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateDeliveryOrderRequest
      const result = await deliveryService.createDeliveryOrder(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { deliveryOrderId } = req.validatedParams as { deliveryOrderId: string }
      const result = await deliveryService.getDeliveryOrder(deliveryOrderId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { deliveryOrderId } = req.validatedParams as { deliveryOrderId: string }
      const body = req.validatedBody as UpdateDeliveryOrderRequest
      const result = await deliveryService.updateDeliveryOrder(deliveryOrderId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { deliveryOrderId } = req.validatedParams as { deliveryOrderId: string }
      const body = req.validatedBody as UpdateDeliveryOrderStatusRequest
      const result = await deliveryService.updateDeliveryOrderStatus(deliveryOrderId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  async assignRider(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { deliveryOrderId } = req.validatedParams as { deliveryOrderId: string }
      const body = req.validatedBody as AssignRiderRequest
      const result = await deliveryService.assignRider(deliveryOrderId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  async getRiders(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { search } = req.validatedQuery as { search?: string }
      const result = await deliveryService.getRiders(ctx, search)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },
}

function buildContext(req: Request): DeliveryContext {
  const { tenantId, branchId, userId, userRole } = req as any

  if (!tenantId || !userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication required')
  }

  return {
    tenantId,
    branchId: branchId ?? null,
    userId,
    userRole: userRole ?? 'customer',
  }
}
