import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { prisma } from '../../database'
import { saleRoutes } from './sales.routes'
import { notFoundHandler, globalErrorHandler } from '../../middleware/globalErrorHandler'

// Mock auth middleware to bypass JWT verification in controller tests
vi.mock('../../middleware/authJwt', () => ({
  authenticateToken: (_req: Request, _res: Response, next: NextFunction) => next(),
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440700'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440701'

const TRUNCATE_SQL = `TRUNCATE TABLE "sales_transactions", "sales_transaction_items", "payments", "audit_logs", "branch_inventory", "inventory_ledger", "products", "product_categories", "tenants", "branches", "users", "sales_transaction_container_exchanges", "sales_transaction_voids" CASCADE`

/**
 * Creates a test Express app. Authentication and permission middleware are
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

  app.use('/sales', saleRoutes)
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

describe('SaleController', () => {
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
      data: { id: 'ctrl-cat-1', tenant_id: TENANT_ID, name: 'Water Products', is_active: true },
    })
    await prisma.product.create({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        tenant_id: TENANT_ID,
        category_id: 'ctrl-cat-1',
        sku: 'CTRL-REFILL',
        name: 'Water Refill',
        type: 'SERVICE',
        unit_of_measure: 'gallon',
        base_price: 20,
        cost_price: 10,
        is_active: true,
      },
    })
    await prisma.product.create({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        tenant_id: TENANT_ID,
        category_id: 'ctrl-cat-1',
        sku: 'CTRL-GALLON',
        name: '5-Gallon Purified Water',
        type: 'FINISHED_GOOD',
        unit_of_measure: 'pc',
        base_price: 55,
        cost_price: 25,
        is_active: true,
      },
    })
    await prisma.branchInventory.create({
      data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: '11111111-1111-1111-1111-111111111111', quantity_on_hand: 100, reserved_quantity: 0 },
    })
    await prisma.branchInventory.create({
      data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: '22222222-2222-2222-2222-222222222222', quantity_on_hand: 50, reserved_quantity: 0 },
    })
    await prisma.user.create({
      data: { id: 'test-user', tenant_id: TENANT_ID, email: 'test@test.com', full_name: 'Test User', password_hash: 'hash' },
    })
    app = createTestApp()
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('POST /sales', () => {
    it('should create a new sale', async () => {
      const res = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 2,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 40,
            method: 'CASH',
          },
        ],
      })

      expect(res.status).toBe(201)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.invoiceNumber).toBeDefined()
      expect(res.body.data.status).toBe('COMPLETED')
    })

    it('should reject non-cash payment', async () => {
      const res = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 1,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 20,
            method: 'GCASH',
          },
        ],
      })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toBe('Cash payment only')
    })

    it('should reject insufficient payment', async () => {
      const res = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 2,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 10,
            method: 'CASH',
          },
        ],
      })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toBe('Insufficient payment amount')
    })

    it('should deduct inventory on sale', async () => {
      await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '22222222-2222-2222-2222-222222222222',
            productName: '5-Gallon Purified Water',
            quantity: 3,
            unitPrice: 55,
          },
        ],
        payments: [
          {
            amount: 165,
            method: 'CASH',
          },
        ],
      })

      const inventory = await prisma.branchInventory.findFirst({
        where: { branch_id: BRANCH_ID, product_id: '22222222-2222-2222-2222-222222222222' },
      })
      expect(Number((inventory as any).quantity_on_hand)).toBe(47)
    })
  })

  describe('GET /sales', () => {
    it('should return a list of sales', async () => {
      const res = await request(app).get('/sales')

      expect(res.status).toBe(200)
      expect(res.body.data).toBeDefined()
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  describe('GET /sales/:saleId', () => {
    it('should return a single sale', async () => {
      const createRes = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 1,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 20,
            method: 'CASH',
          },
        ],
      })

      const saleId = createRes.body.data.id
      const res = await request(app).get(`/sales/${saleId}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(saleId)
    })
  })

  describe('GET /sales/daily-summary', () => {
    it('should return daily summary', async () => {
      const res = await request(app).get('/sales/daily-summary').query({ date: new Date().toISOString() })

      expect(res.status).toBe(200)
      expect(res.body.data).toBeDefined()
      expect(res.body.data.totalTransactions).toBeDefined()
    })
  })

  describe('POST /sales/:saleId/payment', () => {
    it('should record a payment', async () => {
      const createRes = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 1,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 20,
            method: 'CASH',
          },
        ],
      })

      const saleId = createRes.body.data.id
      const res = await request(app).post(`/sales/${saleId}/payment`).send({
        amount: 10,
        method: 'CASH',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('Payment recorded')
    })
  })

  describe('POST /sales/:saleId/void', () => {
    it('should void a sale', async () => {
      const createRes = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 1,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 20,
            method: 'CASH',
          },
        ],
      })

      const saleId = createRes.body.data.id
      const res = await request(app).post(`/sales/${saleId}/void`).send({
        reason: 'Customer changed mind',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('VOID')
    })
  })

  describe('GET /sales/receipt/:saleId', () => {
    it('should return receipt data', async () => {
      const createRes = await request(app).post('/sales').send({
        channel: 'IN_STORE',
        items: [
          {
            productId: '11111111-1111-1111-1111-111111111111',
            productName: 'Water Refill',
            quantity: 1,
            unitPrice: 20,
          },
        ],
        payments: [
          {
            amount: 20,
            method: 'CASH',
          },
        ],
      })

      const saleId = createRes.body.data.id
      const res = await request(app).get(`/sales/receipt/${saleId}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(saleId)
    })
  })
})
