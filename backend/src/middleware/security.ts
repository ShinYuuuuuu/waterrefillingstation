import { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { logger } from '../utils/logger'
import { AppError } from './errorHandler'

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
}

export function sanitizeInput(_req: Request, _res: Response, next: NextFunction) {
  if (typeof _req.body === 'object' && _req.body !== null) {
    _req.body = JSON.parse(JSON.stringify(_req.body))
  }
  next()
}

export function requestLogging(req: Request, _res: Response, next: NextFunction) {
  const start = Date.now()
  const correlationId = req.headers['x-correlation-id'] as string || crypto.randomUUID()
  req.correlationId = correlationId

  _res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: _res.statusCode,
      duration: `${duration}ms`,
      correlationId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  })

  next()
}

declare module 'express' {
  interface Request {
    correlationId?: string
  }
}