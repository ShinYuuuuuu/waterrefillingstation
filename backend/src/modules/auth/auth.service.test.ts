import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { authService } from './auth.service'
import bcrypt from 'bcrypt'

describe('AuthService', () => {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "refresh_tokens", "user_roles", "users", "roles", "tenants" CASCADE`
    await prisma.tenant.create({
      data: { id: 'test-tenant', name: 'Test Tenant', is_active: true },
    })
  })

  afterEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "refresh_tokens", "user_roles", "users", "roles", "tenants" CASCADE`
  })

  describe('login', () => {
    it('should reject login with non-existent email', async () => {
      await expect(
        authService.login({ email: 'nonexistent@test.com', password: 'password123' }),
      ).rejects.toThrow('Invalid email or password')
    })

    it('should reject login with wrong password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 10)
      await prisma.user.create({
        data: {
          tenant_id: 'test-tenant',
          full_name: 'Test User',
          email: 'test@test.com',
          password_hash: passwordHash,
          status: 'active',
        },
      })

      await expect(
        authService.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow('Invalid email or password')
    })

    it('should reject login for deleted user', async () => {
      const passwordHash = await bcrypt.hash('password123', 10)
      await prisma.user.create({
        data: {
          tenant_id: 'test-tenant',
          full_name: 'Deleted User',
          email: 'deleted@test.com',
          password_hash: passwordHash,
          status: 'active',
          deleted_at: new Date(),
        },
      })

      await expect(
        authService.login({ email: 'deleted@test.com', password: 'password123' }),
      ).rejects.toThrow('Account has been deactivated')
    })

    it('should reject login for inactive user', async () => {
      const passwordHash = await bcrypt.hash('password123', 10)
      await prisma.user.create({
        data: {
          tenant_id: 'test-tenant',
          full_name: 'Inactive User',
          email: 'inactive@test.com',
          password_hash: passwordHash,
          status: 'disabled',
        },
      })

      await expect(
        authService.login({ email: 'inactive@test.com', password: 'password123' }),
      ).rejects.toThrow('Account is not active')
    })
  })

  describe('token generation', () => {
    it('should generate valid token pair', async () => {
      const passwordHash = await bcrypt.hash('password123', 10)
      const user = await prisma.user.create({
        data: {
          tenant_id: 'test-tenant',
          full_name: 'Test User',
          email: 'token@test.com',
          password_hash: passwordHash,
          status: 'active',
        },
      })

      await prisma.role.create({
        data: {
          tenant_id: 'test-tenant',
          code: 'CUSTOMER',
          name: 'Customer',
          is_system: true,
        },
      })

      const role = await prisma.role.findFirst({ where: { code: 'CUSTOMER' } })
      if (role) {
        await prisma.userRoleAssignment.create({
          data: {
            tenant_id: 'test-tenant',
            user_id: user.id,
            role_id: role.id,
            is_active: true,
            assigned_by: 'system',
          },
        })
      }

      const tokens = await authService.login({ email: 'token@test.com', password: 'password123' })

      expect(tokens.accessToken).toBeTypeOf('string')
      expect(tokens.refreshToken).toBeTypeOf('string')
      expect(tokens.accessTokenExpiresIn).toBe(900)
    })
  })
})