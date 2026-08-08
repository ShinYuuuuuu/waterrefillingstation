import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { prisma } from '../../database'
import { deliveryRoutes } from './delivery.routes'
import { notFoundHandler, globalErrorHandler } from '../../middleware/globalErrorHandler'

vi.mock('../../middleware/authJwt', () => ({
  authenticateToken: (_req: Request, _res: Response, next: NextFunction) => next(),
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440700'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440701'
const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440702'
const RIDER_ID = '550e8400-e29b-41d4-a716-446655440703'
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440704'

const TRUNCATE_SQL = `TRUNCATE TABLE "delivery_orders", "delivery_order_items", "audit_logs", "user_roles", "roles", "customers", "users", "products", "product_categories", "tenants", "branches" CASCADE`

function createTestApp() {
  const app = express()
  app.use(express.json())

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.tenantId = TENANT_ID
    req.branchId = BRANCH_ID
    req.userId = 'test-user'
    req.userRole = 'owner'
    next()
  })

  app.use('/delivery', deliveryRoutes)
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

describe('DeliveryController', () => {
  let app: express.Express = createTestApp()

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.tenant.create({
      data: { id: TENANT_ID, name: 'Test Tenant', is_active: true },
    })
    await prisma.branch.create({
      data: { id: BRANCH_ID, tenant_id: TENANT_ID, name: 'Test Branch', is_active: true },
    })
    await prisma.user.create({
      data: { id: RIDER_ID, tenant_id: TENANT_ID, branch_id: BRANCH_ID, full_name: 'Test Rider', email: 'rider@test.com', password_hash: 'hash', status: 'active' },
    })
    await prisma.role.create({
      data: { id: 'rider-role-1', tenant_id: TENANT_ID, code: 'rider', name: 'Rider', is_active: true },
    })
    await prisma.userRoleAssignment.create({
      data: { tenant_id: TENANT_ID, user_id: RIDER_ID, role_id: 'rider-role-1', branch_id: BRANCH_ID, is_active: true },
    })
    await prisma.customer.create({
      data: { id: CUSTOMER_ID, tenant_id: TENANT_ID, branch_id: BRANCH_ID, full_name: 'Test Customer', email: 'customer@test.com', phone: '+639100000000', status: 'active', customer_type: 'RETAIL' },
    })
    await prisma.productCategory.create({
      data: { id: 'del-cat-1', tenant_id: TENANT_ID, name: 'Delivery Products', is_active: true },
    })
    await prisma.product.create({
      data: { id: PRODUCT_ID, tenant_id: TENANT_ID, category_id: 'del-cat-1', sku: 'DEL-001', name: 'Delivery Product', type: 'FINISHED_GOOD', unit_of_measure: 'pcs', base_price: 100, cost_price: 50, is_active: true },
    })
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('POST /delivery', () => {
    it('should create a delivery order', async () => {
      const res = await request(app)
        .post('/delivery')
        .send({
          customerId: CUSTOMER_ID,
          orderType: 'ONE_TIME',
          items: [{ productId: PRODUCT_ID, productName: 'Delivery Product', quantity: 2, unitPrice: 100 }],
        })
      expect(res.status).toBe(201)
      expect(res.body.data.customerId).toBe(CUSTOMER_ID)
      expect(res.body.data.items).toHaveLength(1)
    })

    it('should return 400 for missing customer', async () => {
      const res = await request(app)
        .post('/delivery')
        .send({
          items: [{ productId: PRODUCT_ID, productName: 'Delivery Product', quantity: 2, unitPrice: 100 }],
        })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /delivery', () => {
    it('should list delivery orders', async () => {
      const res = await request(app).get('/delivery')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('PATCH /delivery/:id/status', () => {
    it('should update delivery order status', async () => {
      const createRes = await request(app)
        .post('/delivery')
        .send({
          customerId: CUSTOMER_ID,
          orderType: 'ONE_TIME',
          items: [{ productId: PRODUCT_ID, productName: 'Delivery Product', quantity: 2, unitPrice: 100 }],
        })
      const orderId = createRes.body.data.id
      // Auto-assign sets status to ASSIGNED when exactly one rider exists

      const res = await request(app)
        .patch(`/delivery/${orderId}/status`)
        .send({ status: 'OUT_FOR_DELIVERY' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('OUT_FOR_DELIVERY')
    })
  })

  describe('POST /delivery/:id/assign', () => {
    it('should assign rider to delivery order', async () => {
      const createRes = await request(app)
        .post('/delivery')
        .send({
          customerId: CUSTOMER_ID,
          orderType: 'ONE_TIME',
          items: [{ productId: PRODUCT_ID, productName: 'Delivery Product', quantity: 2, unitPrice: 100 }],
        })
      const orderId = createRes.body.data.id

      const res = await request(app)
        .post(`/delivery/${orderId}/assign`)
        .send({ riderId: RIDER_ID })
      expect(res.status).toBe(200)
      expect(res.body.data.assignedRiderId).toBe(RIDER_ID)
    })
  })

  describe('GET /delivery/riders', () => {
    it('should list riders', async () => {
      const res = await request(app).get('/delivery/riders')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })
})
