import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { successResponse } from '../../utils/response'
import { productService } from './product.service'
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductListQuery,
  ProductContext,
} from './product.types'

/**
 * Thin controller for the Product Management module.
 *
 * Controllers are intentionally minimal: they extract context from the
 * request, delegate all business logic to the service, and format the
 * HTTP response.  No business rules live here (AI_PROJECT_RULES.md §3.1).
 *
 * Validation is handled upstream by middleware (validateBody /
 * validateRequest), so req.validatedBody and req.validatedParams are
 * already typed-safe by the time the handler runs.
 */
export const productController = {
  /**
   * POST /products
   * Create a new product.
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateProductRequest

      const result = await productService.createProduct(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /products
   * Retrieve a paginated list of products.
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as ProductListQuery

      const result = await productService.getProducts(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /products/:productId
   * Retrieve a single product by ID.
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { productId } = req.validatedParams as { productId: string }

      const result = await productService.getProduct(productId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /products/:productId
   * Update an existing product.
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { productId } = req.validatedParams as { productId: string }
      const body = req.validatedBody as UpdateProductRequest

      const result = await productService.updateProduct(productId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /products/:productId
   * Soft-delete a product.
   */
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { productId } = req.validatedParams as { productId: string }

      await productService.deleteProduct(productId, ctx)
      return res.status(httpStatus.NO_CONTENT).json(successResponse({ message: 'Product deleted' }))
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
function buildContext(req: Request): ProductContext {
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
