import { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { logger } from '../utils/logger'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5

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

export function loginLimiter(req: Request, res: Response, next: NextFunction) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown'
  const key = `${getKey(req)}:${email}`
  const result = checkLimit(key, LOGIN_RATE_LIMIT_WINDOW_MS, MAX_LOGIN_ATTEMPTS)

  res.setHeader('X-RateLimit-Limit', String(MAX_LOGIN_ATTEMPTS))
  res.setHeader('X-RateLimit-Remaining', String(result.remaining))
  res.setHeader('X-RateLimit-Reset', new Date(result.resetAt).toISOString())

  if (!result.allowed) {
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      email,
    })
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many failed login attempts, please try again later.',
      },
    })
  }

  res.once('finish', () => {
    // Only client-side authentication/validation failures consume an attempt.
    if (res.statusCode < 400 || res.statusCode >= 500) {
      const entry = store.get(key)
      if (!entry || entry.count <= 1) {
        store.delete(key)
      } else {
        entry.count--
      }
    }
  })

  next()
}

export const uploadLimiter = rateLimiter(60 * 1000, 10)
