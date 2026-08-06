import { describe, it, beforeEach, vi, expect } from 'vitest'
import { authenticateToken, requireRole } from './authJwt'
import { AppError } from './errorHandler'
import * as jwtUtils from '../utils/jwt'

describe('authenticateToken middleware', () => {
  let mockReq: any
  let mockRes: any
  let nextFn: any

  beforeEach(() => {
    mockReq = {
      headers: {},
    }
    mockRes = {
      status: () => mockRes,
      json: () => mockRes,
    }
    nextFn = vi.fn()
  })

  it('should reject request without Authorization header', () => {
    authenticateToken(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError))
    const error = nextFn.mock.calls[0][0]
    expect(error.statusCode).toBe(401)
  })

  it('should reject request with invalid Bearer token', () => {
    mockReq.headers.authorization = 'Bearer invalid-token'
    authenticateToken(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError))
    const error = nextFn.mock.calls[0][0]
    expect(error.statusCode).toBe(401)
  })

  it('should accept valid access token', () => {
    const payload = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      branchId: 'branch-123',
      role: 'CASHIER',
      email: 'cashier@test.com',
    }
    const token = jwtUtils.generateAccessToken(payload)
    mockReq.headers.authorization = `Bearer ${token}`
    authenticateToken(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalled()
    expect(mockReq.userId).toBe('user-123')
    expect(mockReq.tenantId).toBe('tenant-123')
    expect(mockReq.userRole).toBe('CASHIER')
  })
})

describe('requireRole middleware', () => {
  let mockReq: any
  let mockRes: any
  let nextFn: any

  beforeEach(() => {
    mockReq = {
      userRole: 'CASHIER',
    }
    mockRes = {
      status: () => mockRes,
      json: () => mockRes,
    }
    nextFn = vi.fn()
  })

  it('should allow access for matching role', () => {
    const middleware = requireRole('CASHIER', 'OWNER')
    middleware(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalled()
  })

  it('should deny access for non-matching role', () => {
    const middleware = requireRole('OWNER', 'BRANCH_MANAGER')
    middleware(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError))
    const error = nextFn.mock.calls[0][0]
    expect(error.statusCode).toBe(403)
  })

  it('should deny access when no role is set', () => {
    mockReq.userRole = undefined
    const middleware = requireRole('CASHIER')
    middleware(mockReq, mockRes, nextFn)
    expect(nextFn).toHaveBeenCalledWith(expect.any(AppError))
    const error = nextFn.mock.calls[0][0]
    expect(error.statusCode).toBe(401)
  })
})