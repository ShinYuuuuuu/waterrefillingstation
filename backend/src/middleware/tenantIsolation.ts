import { Request, Response, NextFunction } from 'express'
import { prisma } from '../database'
import { logger } from '../utils/logger'
import { AppError } from './errorHandler'

export async function tenantIsolation(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return next()
  }

  try {
    const { verifyToken } = await import('../utils/jwt')
    const decoded = verifyToken(token)
    req.tenantId = decoded.tenantId
    req.userId = decoded.userId
    req.userRole = decoded.role
    req.branchId = decoded.branchId ?? undefined
  } catch {
    // Token invalid or expired - continue without tenant context
    // The auth middleware will handle this separately
  }

  next()
}

export async function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return next(new AppError(401, 'Tenant context required'))
  }
  next()
}

export async function requireBranchAccess(req: Request, _res: Response, next: NextFunction) {
  const userRole = req.userRole

  if (userRole === 'SUPER_ADMIN' || userRole === 'OWNER') {
    return next()
  }

  if (!req.branchId) {
    return next(new AppError(403, 'Branch access required'))
  }

  next()
}

declare module 'express' {
  interface Request {
    tenantId?: string
    userId?: string
    userRole?: string
    branchId?: string
  }
}