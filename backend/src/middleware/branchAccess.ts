import { Request, Response, NextFunction } from 'express'
import { Router } from 'express'
import { authenticateToken, requireRole } from './authJwt'
import { rateLimiter } from './rateLimiter'
import { securityHeaders } from './security'
import { logger } from '../utils/logger'
import { AppError } from './errorHandler'
import { prisma } from '../database'

export interface BranchAccessRequest extends Request {
  userId?: string
  tenantId?: string
  userRole?: string
  branchId?: string
}

export function requireBranchAccess(allowedBranchIds?: string[]) {
  return async (req: BranchAccessRequest, _res: Response, next: NextFunction) => {
    if (!req.userId || !req.tenantId) {
      return next(new AppError(401, 'Authentication required'))
    }

    if (req.userRole === 'SUPER_ADMIN' || req.userRole === 'OWNER') {
      return next()
    }

    if (allowedBranchIds && allowedBranchIds.length > 0) {
      if (!req.branchId || !allowedBranchIds.includes(req.branchId)) {
        logger.warn('Branch access denied', {
          userId: req.userId,
          branchId: req.branchId,
          allowedBranchIds,
        })
        return next(new AppError(403, 'Access denied for this branch'))
      }
      return next()
    }

    if (!req.branchId) {
      return next(new AppError(403, 'Branch access required'))
    }

    next()
  }
}

export function validateBranchOwnership(req: BranchAccessRequest, branchId: string): boolean {
  if (req.userRole === 'SUPER_ADMIN' || req.userRole === 'OWNER') {
    return true
  }

  if (req.branchId === branchId) {
    return true
  }

  return false
}