import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../database'
import { authService } from './auth.service'
import { validateBody } from '../../middleware/validateRequest'
import { loginSchema, registerSchema, refreshTokenSchema, logoutSchema } from './auth.schema'
import { logger } from '../../utils/logger'
import { AppError } from '../../middleware/errorHandler'
import { successResponse, errorResponse } from '../../utils/response'
import bcrypt from 'bcrypt'
import { config } from '../../config'

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

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId || !req.tenantId) {
        throw new AppError(401, 'Authentication required')
      }

      const { fullName, email } = req.validatedBody as { fullName: string; email: string }
      const emailOwner = await prisma.user.findFirst({
        where: { email, id: { not: req.userId }, deleted_at: null },
      })
      if (emailOwner) throw new AppError(409, 'Email address is already in use')

      const updated = await prisma.user.update({
        where: { id: req.userId },
        data: { full_name: fullName, email, updated_at: new Date() },
      })

      logger.info('User updated profile', { userId: req.userId })
      return res.status(200).json(successResponse({
        id: updated.id,
        fullName: updated.full_name,
        email: updated.email,
      }))
    } catch (error) {
      next(error)
    }
  },

  async listStaffAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) throw new AppError(401, 'Authentication required')

      const users = await prisma.user.findMany({
        where: {
          tenant_id: req.tenantId,
          deleted_at: null,
          user_roles: { some: { is_active: true, role: { code: { in: ['cashier', 'rider'] } } } },
        },
        include: { user_roles: { where: { is_active: true }, include: { role: true } } },
        orderBy: { full_name: 'asc' },
      })

      return res.status(200).json(successResponse(users.map((user: any) => ({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.user_roles.find((assignment: any) => ['cashier', 'rider'].includes(assignment.role.code))?.role.code.toUpperCase(),
        status: user.status,
      }))))
    } catch (error) {
      next(error)
    }
  },

  async updateStaffAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) throw new AppError(401, 'Authentication required')
      const { userId } = req.validatedParams as { userId: string }
      const { fullName, email, password } = req.validatedBody as {
        fullName: string
        email: string
        password?: string
      }

      const staff = await prisma.user.findFirst({
        where: {
          id: userId,
          tenant_id: req.tenantId,
          deleted_at: null,
          user_roles: { some: { is_active: true, role: { code: { in: ['cashier', 'rider'] } } } },
        },
      })
      if (!staff) throw new AppError(404, 'Cashier or rider account not found')

      const emailOwner = await prisma.user.findFirst({
        where: { email, id: { not: userId }, deleted_at: null },
      })
      if (emailOwner) throw new AppError(409, 'Email address is already in use')

      const data: Record<string, unknown> = {
        full_name: fullName,
        email,
        updated_at: new Date(),
      }
      if (password) data.password_hash = await bcrypt.hash(password, config.bcryptRounds)

      const updated = await prisma.$transaction(async (tx: any) => {
        const user = await tx.user.update({ where: { id: userId }, data })
        if (password) await tx.refreshToken.deleteMany({ where: { user_id: userId } })
        return user
      })

      logger.info('Owner updated staff account', { ownerId: req.userId, staffId: userId })
      return res.status(200).json(successResponse({
        id: updated.id,
        fullName: updated.full_name,
        email: updated.email,
      }))
    } catch (error) {
      next(error)
    }
  },
}
