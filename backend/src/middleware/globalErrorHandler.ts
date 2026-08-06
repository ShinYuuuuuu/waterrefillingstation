import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  const error = new Error(`Route not found: ${req.method} ${req.path}`) as any
  error.statusCode = 404
  next(error)
}

export function globalErrorHandler(
  err: Error & { statusCode?: number; isOperational?: boolean; details?: unknown },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err.statusCode || 500
  const isOperational = err.isOperational ?? false

  logger.error('Unhandled error', {
    message: err.message,
    statusCode,
    isOperational,
    path: _req.path,
    method: _req.method,
  })

  if (statusCode === 400 && err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    })
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.name || 'INTERNAL_SERVER_ERROR',
      message: isOperational ? err.message : 'An unexpected error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
}