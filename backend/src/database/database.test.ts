import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { prisma } from './index'

describe('Database Connection', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should connect to the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`
    expect(result).toBeDefined()
  })

  it('should execute a simple query', async () => {
    const result = await prisma.$queryRaw`SELECT current_timestamp as now`
    expect(result).toBeDefined()
    expect((result as any)[0].now).toBeDefined()
  })

  it('should verify Tenant model is accessible', async () => {
    const count = await prisma.tenant.count()
    expect(typeof count).toBe('number')
  })

  it('should verify User model is accessible', async () => {
    const count = await prisma.user.count()
    expect(typeof count).toBe('number')
  })

  it('should verify Role model is accessible', async () => {
    const count = await prisma.role.count()
    expect(typeof count).toBe('number')
  })
})