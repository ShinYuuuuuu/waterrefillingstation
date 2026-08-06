import jwt from 'jsonwebtoken'
import { config } from '../config'
import { logger } from './logger'

export interface JwtPayload {
  userId: string
  tenantId: string
  branchId: string | null
  role: string
  email: string
  iat: number
  exp: number
}

export function generateAccessToken(payload: {
  userId: string
  tenantId: string
  branchId: string | null
  role: string
  email: string
}): string {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiry as any,
    issuer: 'wsms',
    audience: 'wsms-client',
  })
}

export function generateRefreshToken(payload: {
  userId: string
  tenantId: string
  email: string
}): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry as any,
    issuer: 'wsms',
    audience: 'wsms-client',
  })
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtAccessSecret, {
      issuer: 'wsms',
      audience: 'wsms-client',
    }) as JwtPayload
  } catch (error) {
    // Try refresh token secret
    try {
      return jwt.verify(token, config.jwtRefreshSecret, {
        issuer: 'wsms',
        audience: 'wsms-client',
      }) as JwtPayload
    } catch {
      throw new Error('Invalid token')
    }
  }
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtAccessSecret, {
    issuer: 'wsms',
    audience: 'wsms-client',
  }) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtRefreshSecret, {
    issuer: 'wsms',
    audience: 'wsms-client',
  }) as JwtPayload
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }
  return Date.now() >= decoded.exp * 1000
}