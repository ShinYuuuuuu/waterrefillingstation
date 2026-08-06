import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public details?: unknown,
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message)
  }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.name,
        message: err.message,
      },
    })
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  })
}
