import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'
import { logger } from '../utils/logger'
import { AppError } from './errorHandler'

export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      req.validatedBody = result.body ?? req.body
      req.validatedQuery = result.query ?? req.query
      req.validatedParams = result.params ?? req.params
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }))
        logger.warn('Request validation failed', { details })
        return next(new AppError(400, 'Validation failed', true, { details }))
      }
      next(error)
    }
  }
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body)
      req.validatedBody = result
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }))
        logger.warn('Body validation failed', { details })
        return next(new AppError(400, 'Validation failed', true, { details }))
      }
      next(error)
    }
  }
}

declare module 'express' {
  interface Request {
    validatedBody?: unknown
    validatedQuery?: unknown
    validatedParams?: unknown
  }
}