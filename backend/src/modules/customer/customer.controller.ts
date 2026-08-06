import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { successResponse } from '../../utils/response'
import { customerService } from './customer.service'
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerListQuery,
  CustomerContext,
} from './customer.types'

/**
 * Thin controller for the Customer Management module.
 *
 * Controllers are intentionally minimal: they extract context from the
 * request, delegate all business logic to the service, and format the
 * HTTP response.  No business rules live here (AI_PROJECT_RULES.md §3.1).
 *
 * Validation is handled upstream by middleware (validateBody /
 * validateRequest), so req.validatedBody and req.validatedParams are
 * already typed-safe by the time the handler runs.
 */
export const customerController = {
  /**
   * POST /customers
   * Create a new customer.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateCustomerRequest

      const result = await customerService.createCustomer(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /customers
   * Retrieve a paginated list of customers.
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as CustomerListQuery

      const result = await customerService.getCustomers(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /customers/:customerId
   * Retrieve a single customer by ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { customerId } = req.validatedParams as { customerId: string }

      const result = await customerService.getCustomer(customerId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /customers/:customerId
   * Update an existing customer.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { customerId } = req.validatedParams as { customerId: string }
      const body = req.validatedBody as UpdateCustomerRequest

      const result = await customerService.updateCustomer(customerId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /customers/:customerId
   * Soft-delete a customer.
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { customerId } = req.validatedParams as { customerId: string }

      await customerService.deleteCustomer(customerId, ctx)
      return res.status(httpStatus.NO_CONTENT).json(successResponse({ message: 'Customer deleted' }))
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
function buildContext(req: Request): CustomerContext {
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
