import { describe, it, beforeEach, vi, expect } from 'vitest'
import { validateBody } from './validateRequest'
import { z } from 'zod'
import { AppError } from '../middleware/errorHandler'

const testSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

describe('validateBody middleware', () => {
  let mockReq: any
  let mockRes: any
  let nextFn: any

  beforeEach(() => {
    mockReq = {
      body: {},
    }
    mockRes = {
      status: () => mockRes,
      json: () => mockRes,
    }
    nextFn = vi.fn()
  })

  it('should call next() for valid request body', () => {
    mockReq.body = { email: 'test@test.com', password: 'password123' }
    const middleware = validateBody(testSchema)
    middleware(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalled()
    expect(mockReq.validatedBody).toEqual({ email: 'test@test.com', password: 'password123' })
  })

  it('should call next() with AppError for invalid body', () => {
    mockReq.body = { email: 'invalid-email', password: 'short' }
    const middleware = validateBody(testSchema)
    middleware(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError))
    const error = nextFn.mock.calls[0][0]
    expect(error.statusCode).toBe(400)
  })

  it('should call next() with error for non-Zod errors', () => {
    mockReq.body = null
    const middleware = validateBody(testSchema)
    middleware(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalledWith(expect.any(Error))
  })
})