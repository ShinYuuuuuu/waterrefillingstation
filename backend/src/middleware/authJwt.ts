import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { logger } from '../utils/logger'
import { AppError } from './errorHandler'
import { prisma } from '../database'

export interface AuthenticatedRequest extends Request {
  userId?: string
  tenantId?: string
  userRole?: string
  branchId?: string
}

export function authenticateToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Access token required'))
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyAccessToken(token)
    req.userId = decoded.userId
    req.tenantId = decoded.tenantId
    req.branchId = decoded.branchId ?? undefined
    req.userRole = decoded.role
    next()
  } catch (error) {
    logger.warn('Token verification failed', { error: (error as Error).message })
    return next(new AppError(401, 'Invalid or expired access token'))
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new AppError(401, 'Authentication required'))
    }

    if (!allowedRoles.includes(req.userRole)) {
      logger.warn('Role-based access denied', {
        userId: req.userId,
        role: req.userRole,
        requiredRoles: allowedRoles,
      })
      return next(new AppError(403, 'Insufficient permissions'))
    }

    next()
  }
}

export function requirePermission(permissionCode: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.userId || !req.tenantId) {
      return next(new AppError(401, 'Authentication required'))
    }

    try {
      const userRoleAssignments = await prisma.userRoleAssignment.findMany({
        where: {
          user_id: req.userId,
          tenant_id: req.tenantId,
          is_active: true,
        },
        include: {
          role: {
            include: {
              role_permissions: {
                where: { permission: { code: permissionCode } },
              },
            },
          },
        },
      })

       const hasPermission = userRoleAssignments.some(
         (assignment: { role: { role_permissions: unknown[] } }) => assignment.role.role_permissions.length > 0,
       )

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.userId,
          tenantId: req.tenantId,
          permissionCode,
        })
        return next(new AppError(403, 'Insufficient permissions'))
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}