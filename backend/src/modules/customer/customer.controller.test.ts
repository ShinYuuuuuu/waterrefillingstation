import { describe, it, beforeEach, afterEach, expect, beforeAll, afterAll, vi } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { prisma } from '../../database'
import { customerRoutes } from './customer.routes'
import { notFoundHandler, globalErrorHandler } from '../../middleware/globalErrorHandler'

// Mock auth middleware to bypass JWT verification in controller tests
vi.mock('../../middleware/authJwt', () => ({
  authenticateToken: (_req: Request, _res: Response, next: NextFunction) => next(),
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440300'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440301'

const TRUNCATE_SQL = `TRUNCATE TABLE "customers", "customer_container_balances", "customer_addresses", "customer_tags", "customer_ledger", "audit_logs", "products", "product_categories", "tenants", "branches", "users" CASCADE`

/**
 * Creates a test Express app.  Authentication and permission middleware are
 * replaced with a mock that injects a test user context, so the controller
 * and its validation middleware are exercised in isolation.
 */
function createTestApp() {
  const app = express()
  app.use(express.json())

  // Mock auth middleware — simulates authenticateToken + tenantIsolation
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.tenantId = TENANT_ID
    req.branchId = BRANCH_ID
    req.userId = 'test-user'
    req.userRole = 'OWNER'
    next()
  })

  app.use('/customers', customerRoutes)
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

describe('CustomerController', () => {
  let app: express.Express

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.tenant.create({
      data: { id: TENANT_ID, name: 'Test Tenant', is_active: true },
    })
    await prisma.branch.create({
      data: { id: BRANCH_ID, tenant_id: TENANT_ID, name: 'Test Branch', is_active: true },
    })
    await prisma.productCategory.create({
      data: { id: 'ctrl-cat-1', tenant_id: TENANT_ID, name: 'Containers', is_active: true },
    })
    await prisma.product.create({
      data: {
        id: 'ctrl-prod-1',
        tenant_id: TENANT_ID,
        category_id: 'ctrl-cat-1',
        sku: 'CTRL-5G',
        name: '5-gallon container',
        type: 'CONTAINER',
        is_container: true,
        unit_of_measure: 'pc',
        base_price: 100,
        cost_price: 50,
        is_active: true,
      },
    })
    await prisma.user.create({
      data: { id: 'test-user', tenant_id: TENANT_ID, email: 'test@test.com', full_name: 'Test User', password_hash: 'hash' },
    })
    app = createTestApp()
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.$disconnect()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "customers", "customer_container_balances", "audit_logs" CASCADE')
  })

  describe('POST /customers', () => {
    it('should create a customer and return 201', async () => {
      const res = await request(app).post('/customers').send({
        fullName: 'New Customer',
        phone: '+639171000000',
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.fullName).toBe('New Customer')
      expect(res.body.data.phone).toBe('+639171000000')
      expect(res.body.data.tenantId).toBe(TENANT_ID)
    })

    it('should return 400 for missing phone', async () => {
      const res = await request(app).post('/customers').send({
        fullName: 'No Phone',
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('Validation failed')
    })

    it('should return 400 for missing full name', async () => {
      const res = await request(app).post('/customers').send({
        phone: '+639171000001',
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /customers', () => {
    beforeEach(async () => {
      // Seed a few customers directly
      await prisma.customer.createMany({
        data: [
          { tenant_id: TENANT_ID, branch_id: BRANCH_ID, full_name: 'List A', phone: '+639171000010' },
          { tenant_id: TENANT_ID, branch_id: BRANCH_ID, full_name: 'List B', phone: '+639171000020', status: 'inactive' },
          { tenant_id: TENANT_ID, branch_id: BRANCH_ID, full_name: 'List C', phone: '+639171000030' },
        ],
      })
    })

    it('should return a paginated list with 200', async () => {
      const res = await request(app).get('/customers').query({ page: 1, limit: 2 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.meta.total).toBe(3)
      expect(res.body.meta.page).toBe(1)
      expect(res.body.meta.limit).toBe(2)
      expect(res.body.meta.totalPages).toBe(2)
    })

    it('should support search', async () => {
      const res = await request(app).get('/customers').query({ search: 'List A' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].fullName).toBe('List A')
    })

    it('should support status filter', async () => {
      const res = await request(app).get('/customers').query({ status: 'inactive' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].status).toBe('inactive')
    })
  })

  describe('GET /customers/:customerId', () => {
    let customerId: string

    beforeEach(async () => {
      const created = await prisma.customer.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          full_name: 'Detail Customer',
          phone: '+639171000040',
        },
      })
      customerId = created.id
    })

    it('should return customer details with 200', async () => {
      const res = await request(app).get(`/customers/${customerId}`)

      expect(res.status).toBe(200)
      expect(res.body.data.fullName).toBe('Detail Customer')
      expect(res.body.data.tenantId).toBe(TENANT_ID)
    })

    it('should return 404 for non-existent customer', async () => {
      const res = await request(app).get('/customers/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
      expect(res.body.error.message).toBe('Customer not found')
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).get('/customers/not-a-uuid')

      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain('Validation failed')
    })
  })

  describe('PUT /customers/:customerId', () => {
    let customerId: string

    beforeEach(async () => {
      const created = await prisma.customer.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          full_name: 'Before Update',
          phone: '+639171000050',
        },
      })
      customerId = created.id
    })

    it('should update and return customer with 200', async () => {
      const res = await request(app).put(`/customers/${customerId}`).send({
        fullName: 'After Update',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.fullName).toBe('After Update')
      expect(res.body.data.phone).toBe('+639171000050')
    })

    it('should return 403 when attempting to modify balance', async () => {
      const res = await request(app).put(`/customers/${customerId}`).send({
        currentBalance: 9999,
      })

      expect(res.status).toBe(403)
      expect(res.body.error.message).toContain('balance')
    })

    it('should return 409 for duplicate phone', async () => {
      await prisma.customer.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          full_name: 'Other',
          phone: '+639171000060',
        },
      })

      const res = await request(app).put(`/customers/${customerId}`).send({
        phone: '+639171000060',
      })

      expect(res.status).toBe(409)
    })

    it('should return 404 for non-existent customer', async () => {
      const res = await request(app).put('/customers/550e8400-e29b-41d4-a716-999999999999').send({
        fullName: 'Ghost',
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).put('/customers/invalid').send({ fullName: 'Test' })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /customers/:customerId', () => {
    let customerId: string

    beforeEach(async () => {
      const created = await prisma.customer.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          full_name: 'Delete Me',
          phone: '+639171000070',
        },
      })
      customerId = created.id
    })

    it('should soft-delete and return 204', async () => {
      const res = await request(app).delete(`/customers/${customerId}`)

      expect(res.status).toBe(204)

      // Verify soft delete in DB
      const raw = await prisma.customer.findUnique({ where: { id: customerId } })
      expect(raw!.deleted_at).not.toBeNull()
    })

    it('should return 409 when customer has outstanding balance', async () => {
      await prisma.customer.update({
        where: { id: customerId },
        data: { current_balance: 500 },
      })

      const res = await request(app).delete(`/customers/${customerId}`)

      expect(res.status).toBe(409)
      expect(res.body.error.message).toBe('Cannot delete customer with outstanding balance')
    })

    it('should return 409 when customer has active delivery orders', async () => {
      await prisma.deliveryOrder.create({
        data: {
          id: 'do-ctrl-1',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          customer_id: customerId,
          address_id: null,
          status: 'PENDING',
        },
      })

      const res = await request(app).delete(`/customers/${customerId}`)

      expect(res.status).toBe(409)
      expect(res.body.error.message).toBe('Cannot delete customer with active delivery orders')
    })

    it('should return 404 for non-existent customer', async () => {
      const res = await request(app).delete('/customers/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).delete('/customers/not-a-uuid')

      expect(res.status).toBe(400)
    })
  })
})
