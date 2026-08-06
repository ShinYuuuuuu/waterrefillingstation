import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../../database'
import { config } from '../../config'
import { logger } from '../../utils/logger'
import { AppError } from '../../middleware/errorHandler'
import {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  LogoutRequest,
  AuthTokens,
  AuthUser,
  TokenPair,
} from './auth.types'

const SALT_ROUNDS = config.bcryptRounds

export class AuthService {
  async login(request: LoginRequest): Promise<TokenPair> {
    const { email, password } = request

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        user_roles: {
          where: { is_active: true },
          include: { role: true },
        },
      },
    })

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email })
      throw new AppError(401, 'Invalid email or password')
    }

    if (user.deleted_at) {
      logger.warn('Login attempt for deleted user', { email, userId: user.id })
      throw new AppError(401, 'Account has been deactivated')
    }

    if (user.status !== 'active') {
      logger.warn('Login attempt for inactive user', { email, userId: user.id, status: user.status })
      throw new AppError(401, 'Account is not active')
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash)
    if (!passwordValid) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id })
      throw new AppError(401, 'Invalid email or password')
    }

    const role = user.user_roles[0]?.role?.code || 'CUSTOMER'

    const tokens = this.generateTokenPair(user, role)

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    })

    await this.createRefreshToken(user.id, user.tenant_id, tokens.refreshToken)

    logger.info('User logged in successfully', { userId: user.id, email })

    return tokens
  }

  async register(request: RegisterRequest): Promise<TokenPair> {
    const { email, password, fullName, phone, roleCode } = request

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new AppError(409, 'Email already registered')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        tenant_id: request.email.split('@')[1] || 'default',
        full_name: fullName,
        email,
        phone,
        password_hash: passwordHash,
        status: 'active',
        created_by: 'system',
      },
    })

    const role = await prisma.role.findFirst({
      where: { code: roleCode },
    })

    if (role) {
      await prisma.userRoleAssignment.create({
        data: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          role_id: role.id,
          is_active: true,
          assigned_by: 'system',
        },
      })
    }

    const tokens = this.generateTokenPair(user, roleCode)
    await this.createRefreshToken(user.id, user.tenant_id, tokens.refreshToken)

    logger.info('User registered successfully', { userId: user.id, email })

    return tokens
  }

  async refreshToken(request: RefreshTokenRequest): Promise<TokenPair> {
    const { refreshToken } = request

    const decoded = this.verifyRefreshToken(refreshToken)

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!storedToken || storedToken.revoked || storedToken.expires_at < new Date()) {
      logger.warn('Invalid or expired refresh token attempt')
      throw new AppError(401, 'Invalid or expired refresh token')
    }

    const user = storedToken.user
    if (!user || user.deleted_at || user.status !== 'active') {
      throw new AppError(401, 'User account is not active')
    }

    const role = user.user_roles[0]?.role?.code || 'CUSTOMER'

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    })

    const tokens = this.generateTokenPair(user, role)
    await this.createRefreshToken(user.id, user.tenant_id, tokens.refreshToken)

    logger.info('Token refreshed successfully', { userId: user.id })

    return tokens
  }

  async logout(request: LogoutRequest): Promise<void> {
    const { refreshToken } = request

    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    })

    logger.info('User logged out', { refreshToken: this.maskToken(refreshToken) })
  }

  async logoutAll(userId: string, tenantId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        revoked: false,
      },
      data: { revoked: true },
    })

    logger.info('All sessions invalidated', { userId })
  }

  private generateTokenPair(user: { id: string; tenant_id: string; branch_id: string | null; email: string }, role: string): TokenPair {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        branchId: user.branch_id,
        role,
        email: user.email,
      },
      config.jwtAccessSecret,
      { expiresIn: config.jwtAccessExpiry as any, issuer: 'wsms', audience: 'wsms-client' },
    )

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
      },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiry as any, issuer: 'wsms', audience: 'wsms-client' },
    )

    const expiresIn = this.parseExpiry(config.jwtAccessExpiry)

    return { accessToken, refreshToken, accessTokenExpiresIn: expiresIn }
  }

  private async createRefreshToken(userId: string, tenantId: string, token: string): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        token,
        expires_at: expiresAt,
        revoked: false,
      },
    })
  }

  private verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, config.jwtRefreshSecret, {
        issuer: 'wsms',
        audience: 'wsms-client',
      })
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token')
    }
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/)
    if (!match) return 900

    const value = parseInt(match[1], 10)
    const unit = match[2]

    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 24 * 60 * 60
      default: return 900
    }
  }

  private maskToken(token: string): string {
    if (token.length <= 8) return '****'
    return `${token.substring(0, 4)}****${token.substring(token.length - 4)}`
  }
}

export const authService = new AuthService()