import { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { logger } from '../utils/logger'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

setInterval(cleanup, 60000)

function getKey(req: Request): string {
  return `${req.ip}:${req.path}`
}

function checkLimit(key: string, windowMs: number, max: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs }
  }

  entry.count++
  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt }
}

export function rateLimiter(windowMs?: number, max?: number) {
  const window = windowMs ?? config.rateLimitWindowMs
  const limit = max ?? config.rateLimitMaxRequests

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getKey(req)
    const result = checkLimit(key, window, limit)

    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(result.remaining))
    res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString())

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        key,
      })
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      })
    }

    next()
  }
}

export const loginLimiter = rateLimiter(15 * 60 * 1000, 5)
export const uploadLimiter = rateLimiter(60 * 1000, 10)