import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../database'
import { authService } from './auth.service'
import { validateBody } from '../../middleware/validateRequest'
import { loginSchema, registerSchema, refreshTokenSchema, logoutSchema } from './auth.schema'
import { logger } from '../../utils/logger'
import { AppError } from '../../middleware/errorHandler'
import { successResponse, errorResponse } from '../../utils/response'

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = loginSchema.safeParse({ body: req.body })
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }))
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Validation failed', details))
      }

      const tokens = await authService.login(result.data.body)
      return res.status(200).json(successResponse(tokens))
    } catch (error) {
      next(error)
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = registerSchema.safeParse({ body: req.body })
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }))
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Validation failed', details))
      }

      const tokens = await authService.register(result.data.body)
      return res.status(201).json(successResponse(tokens))
    } catch (error) {
      next(error)
    }
  },

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const result = refreshTokenSchema.safeParse({ body: req.body })
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }))
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Validation failed', details))
      }

      const tokens = await authService.refreshToken(result.data.body)
      return res.status(200).json(successResponse(tokens))
    } catch (error) {
      next(error)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const result = logoutSchema.safeParse({ body: req.body })
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }))
        return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Validation failed', details))
      }

      await authService.logout(result.data.body)
      return res.status(200).json(successResponse({ message: 'Logged out successfully' }))
    } catch (error) {
      next(error)
    }
  },

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      const tenantId = req.tenantId

      if (!userId || !tenantId) {
        throw new AppError(401, 'Authentication required')
      }

      await authService.logoutAll(userId, tenantId)
      return res.status(200).json(successResponse({ message: 'All sessions invalidated' }))
    } catch (error) {
      next(error)
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId
      const tenantId = req.tenantId

      if (!userId || !tenantId) {
        throw new AppError(401, 'Authentication required')
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          user_roles: {
            where: { is_active: true },
            include: { role: true },
          },
        },
      })

      if (!user || user.deleted_at) {
        throw new AppError(404, 'User not found')
      }

      const authUser = {
        id: user.id,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        fullName: user.full_name,
        email: user.email,
        role: user.user_roles[0]?.role?.code || 'CUSTOMER',
      }

      return res.status(200).json(successResponse(authUser))
    } catch (error) {
      next(error)
    }
  },
}