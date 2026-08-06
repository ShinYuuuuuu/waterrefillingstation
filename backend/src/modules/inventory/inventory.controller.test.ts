import { describe, it, beforeEach, afterEach, beforeAll, afterAll, expect, vi } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { prisma } from '../../database'
import { inventoryRoutes } from './inventory.routes'
import { notFoundHandler, globalErrorHandler } from '../../middleware/globalErrorHandler'

// Mock auth middleware to bypass JWT verification in controller tests
vi.mock('../../middleware/authJwt', () => ({
  authenticateToken: (_req: Request, _res: Response, next: NextFunction) => next(),
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const TENANT_ID = '550e8400-e29b-41d4-a716-446655470000'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655470001'
const OTHER_BRANCH_ID = '550e8400-e29b-41d4-a716-446655470002'

const TRUNCATE_SQL = `TRUNCATE TABLE "branch_inventory", "inventory_ledger", "production_batches", "stock_transfers", "stock_transfer_items", "stock_count_sessions", "stock_count_items", "audit_logs", "products", "product_categories", "tenants", "branches", "users" CASCADE`

function createTestApp() {
  const app = express()
  app.use(express.json())

  // Mock auth middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.tenantId = TENANT_ID
    req.branchId = BRANCH_ID
    req.userId = 'test-user'
    req.userRole = 'OWNER'
    next()
  })

  app.use('/inventory', inventoryRoutes)
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

describe('InventoryController', () => {
  let app: express.Express

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.tenant.create({
      data: { id: TENANT_ID, name: 'Test Tenant', is_active: true },
    })
    await prisma.branch.create({
      data: { id: BRANCH_ID, tenant_id: TENANT_ID, name: 'Test Branch', is_active: true },
    })
    await prisma.branch.create({
      data: { id: OTHER_BRANCH_ID, tenant_id: TENANT_ID, name: 'Other Branch', is_active: true },
    })
    await prisma.productCategory.create({
      data: { id: '550e8400-e29b-41d4-a716-446655470005', tenant_id: TENANT_ID, name: 'Containers', is_active: true },
    })
    await prisma.product.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655470003',
        tenant_id: TENANT_ID,
        category_id: '550e8400-e29b-41d4-a716-446655470005',
        sku: 'CTRL-WATER',
        name: '5-Gallon Water',
        type: 'FINISHED_GOOD',
        unit_of_measure: 'pc',
        base_price: 55,
        cost_price: 25,
        reorder_level: 10,
        is_active: true,
      },
    })
    await prisma.product.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655470004',
        tenant_id: TENANT_ID,
        category_id: '550e8400-e29b-41d4-a716-446655470005',
        sku: 'CTRL-RAW',
        name: 'Raw Water',
        type: 'RAW_MATERIAL',
        unit_of_measure: 'liter',
        base_price: 5,
        cost_price: 3,
        reorder_level: 100,
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
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "branch_inventory", "inventory_ledger", "production_batches", "stock_transfers", "stock_transfer_items", "stock_count_sessions", "stock_count_items", "audit_logs" CASCADE')
  })

  // =======================================================================
  // BRANCH INVENTORY
  // =======================================================================

  describe('POST /inventory/branch', () => {
    it('should create branch inventory and return 201', async () => {
      const res = await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.productId).toBe('550e8400-e29b-41d4-a716-446655470003')
      expect(res.body.data.quantityOnHand).toBe(100)
      expect(res.body.data.availableQuantity).toBe(100)
      expect(res.body.data.tenantId).toBe(TENANT_ID)
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470006',
      })

      expect(res.status).toBe(404)
      expect(res.body.error.message).toBe('Product not found')
    })

    it('should return 400 for missing productId', async () => {
      const res = await request(app).post('/inventory/branch').send({
        quantityOnHand: 100,
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /inventory/branch', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470004',
        quantityOnHand: 200,
      })
    })

    it('should return paginated list with 200', async () => {
      const res = await request(app).get('/inventory/branch').query({ page: 1, limit: 1 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.meta.total).toBe(2)
      expect(res.body.meta.totalPages).toBe(2)
    })

    it('should filter by productId', async () => {
      const res = await request(app).get('/inventory/branch').query({ productId: '550e8400-e29b-41d4-a716-446655470003' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].productId).toBe('550e8400-e29b-41d4-a716-446655470003')
    })

    it('should filter for low stock', async () => {
      const res = await request(app).get('/inventory/branch').query({ lowStock: true })

      // 550e8400-e29b-41d4-a716-446655470003: 100 on hand, reorder_level=10 → not low
      // 550e8400-e29b-41d4-a716-446655470004: 200 on hand, reorder_level=100 → not low
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })

    it('should return low stock items correctly', async () => {
      // Reduce stock to trigger low stock alert
      await prisma.branchInventory.updateMany({
        where: { tenant_id: TENANT_ID, product_id: '550e8400-e29b-41d4-a716-446655470003' },
        data: { quantity_on_hand: 5 },
      })

      const res = await request(app).get('/inventory/branch').query({ lowStock: true })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].productId).toBe('550e8400-e29b-41d4-a716-446655470003')
      expect(res.body.data[0].availableQuantity).toBe(5)
    })
  })

  describe('GET /inventory/branch/:inventoryId', () => {
    let inventoryId: string

    beforeEach(async () => {
      const res = await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      inventoryId = res.body.data.id
    })

    it('should return branch inventory with 200', async () => {
      const res = await request(app).get(`/inventory/branch/${inventoryId}`)

      expect(res.status).toBe(200)
      expect(res.body.data.productId).toBe('550e8400-e29b-41d4-a716-446655470003')
      expect(res.body.data.quantityOnHand).toBe(100)
    })

    it('should return 404 for non-existent inventory', async () => {
      const res = await request(app).get('/inventory/branch/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
      expect(res.body.error.message).toBe('BranchInventory not found')
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).get('/inventory/branch/not-a-uuid')

      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain('Validation failed')
    })
  })

  describe('PUT /inventory/branch/:inventoryId', () => {
    let inventoryId: string

    beforeEach(async () => {
      const res = await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      inventoryId = res.body.data.id
    })

    it('should update and return 200', async () => {
      const res = await request(app).put(`/inventory/branch/${inventoryId}`).send({
        quantityOnHand: 200,
        reservedQuantity: 10,
      })

      expect(res.status).toBe(200)
      expect(res.body.data.quantityOnHand).toBe(200)
      expect(res.body.data.reservedQuantity).toBe(10)
      expect(res.body.data.availableQuantity).toBe(190)
    })

    it('should return 404 for non-existent inventory', async () => {
      const res = await request(app).put('/inventory/branch/550e8400-e29b-41d4-a716-999999999999').send({
        quantityOnHand: 100,
      })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /inventory/branch/:inventoryId', () => {
    let inventoryId: string

    beforeEach(async () => {
      const res = await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      inventoryId = res.body.data.id
    })

    it('should soft-delete and return 204', async () => {
      const res = await request(app).delete(`/inventory/branch/${inventoryId}`)

      expect(res.status).toBe(204)
      // 204 No Content has no response body, so we verify the side-effect instead

      const raw = await prisma.branchInventory.findUnique({ where: { id: inventoryId } })
      expect(raw!.deleted_at).not.toBeNull()
    })
  })

  // =======================================================================
  // LOW STOCK ALERTS
  // =======================================================================

  describe('GET /inventory/alerts/low-stock', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 5,
      })
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470004',
        quantityOnHand: 200,
      })
    })

    it('should return low stock alerts', async () => {
      const res = await request(app).get('/inventory/alerts/low-stock')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].productId).toBe('550e8400-e29b-41d4-a716-446655470003')
      expect(res.body.data[0].availableQuantity).toBe(5)
      expect(res.body.data[0].reorderLevel).toBe(10)
    })
  })

  // =======================================================================
  // INVENTORY LEDGER
  // =======================================================================

  describe('GET /inventory/ledger', () => {
    beforeEach(async () => {
      await prisma.inventoryLedger.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: '550e8400-e29b-41d4-a716-446655470003',
          movement_type: 'PURCHASE',
          quantity_delta: 100,
          notes: 'Initial stock',
          created_by: 'test-user',
        },
      })
      await prisma.inventoryLedger.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: '550e8400-e29b-41d4-a716-446655470003',
          movement_type: 'SALE',
          quantity_delta: -5,
          created_by: 'test-user',
        },
      })
    })

    it('should return paginated ledger entries', async () => {
      const res = await request(app).get('/inventory/ledger').query({ page: 1, limit: 10 })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.meta.total).toBe(2)
    })

    it('should filter by movement type', async () => {
      const res = await request(app).get('/inventory/ledger').query({ movementType: 'PURCHASE' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].movementType).toBe('PURCHASE')
    })
  })

  describe('GET /inventory/ledger/:ledgerId', () => {
    let ledgerId: string

    beforeEach(async () => {
      const entry = await prisma.inventoryLedger.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: '550e8400-e29b-41d4-a716-446655470003',
          movement_type: 'PURCHASE',
          quantity_delta: 100,
          notes: 'Initial stock',
          created_by: 'test-user',
        },
      })
      ledgerId = entry.id
    })

    it('should return a ledger entry with 200', async () => {
      const res = await request(app).get(`/inventory/ledger/${ledgerId}`)

      expect(res.status).toBe(200)
      expect(res.body.data.movementType).toBe('PURCHASE')
      expect(res.body.data.quantityDelta).toBe(100)
    })

    it('should return 404 for non-existent entry', async () => {
      const res = await request(app).get('/inventory/ledger/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
      expect(res.body.error.message).toBe('InventoryLedger not found')
    })
  })

  // =======================================================================
  // PRODUCTION BATCH
  // =======================================================================

  describe('POST /inventory/production-batches', () => {
    it('should create a production batch and return 201', async () => {
      const res = await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-CTRL-1',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 240,
        qualityCheckPassed: true,
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.batchNumber).toBe('PB-CTRL-1')
      expect(res.body.data.outputQuantity).toBe(240)
      expect(res.body.data.qualityCheckPassed).toBe(true)
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-FAIL',
        outputProductId: '550e8400-e29b-41d4-a716-446655470999',
        outputQuantity: 100,
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid batch number (duplicate)', async () => {
      await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-DUP',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 100,
      })

      const res = await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-DUP',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 200,
      })

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('already exists')
    })
  })

  describe('GET /inventory/production-batches', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-LIST-1',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 240,
      })
      const res2 = await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-LIST-2',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 100,
      })
      await request(app).patch(`/inventory/production-batches/${res2.body.data.id}/complete`)
    })

    it('should return paginated list', async () => {
      const res = await request(app).get('/inventory/production-batches').query({ page: 1, limit: 1 })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.meta.total).toBe(2)
    })
  })

  describe('GET /inventory/production-batches/{batchId}', () => {
    it('should return batch details with ledger entries', async () => {
      const createRes = await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-DETAIL',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 240,
      })

      const res = await request(app).get(`/inventory/production-batches/${createRes.body.data.id}`)

      expect(res.status).toBe(200)
      expect(res.body.data.batchNumber).toBe('PB-DETAIL')
      expect(res.body.data.ledgerEntries).toHaveLength(1)
      expect(res.body.data.ledgerEntries[0].movementType).toBe('PRODUCTION')
      expect(res.body.data.ledgerEntries[0].quantityDelta).toBe(240)
    })
  })

  describe('PATCH /inventory/production-batches/{batchId}/complete', () => {
    it('should complete a batch', async () => {
      const createRes = await request(app).post('/inventory/production-batches').send({
        batchNumber: 'PB-COMPLETE',
        outputProductId: '550e8400-e29b-41d4-a716-446655470003',
        outputQuantity: 240,
      })

      const res = await request(app).patch(
        `/inventory/production-batches/${createRes.body.data.id}/complete`,
      )

      expect(res.status).toBe(200)
      expect(res.body.data.completedAt).not.toBeNull()
    })
  })

  // =======================================================================
  // STOCK TRANSFER
  // =======================================================================

  describe('POST /inventory/stock-transfers', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
    })

    it('should create a stock transfer in PENDING status', async () => {
      const res = await request(app).post('/inventory/stock-transfers').send({
        destinationBranchId: OTHER_BRANCH_ID,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', quantity: 50 }],
      })

      expect(res.status).toBe(201)
      expect(res.body.data.status).toBe('PENDING')
      expect(res.body.data.items).toHaveLength(1)
      expect(res.body.data.items[0].quantitySent).toBe(50)
    })

    it('should return 409 for insufficient stock', async () => {
      const res = await request(app).post('/inventory/stock-transfers').send({
        destinationBranchId: OTHER_BRANCH_ID,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', quantity: 999 }],
      })

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('Insufficient stock')
    })

    it('should return 400 for same origin and destination', async () => {
      const res = await request(app).post('/inventory/stock-transfers').send({
        destinationBranchId: BRANCH_ID,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', quantity: 10 }],
      })

      expect(res.status).toBe(400)
      expect(res.body.error.message).toContain('must be different')
    })
  })

  describe('PATCH /inventory/stock-transfers/{transferId}/status', () => {
    let transferId: string

    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      const res = await request(app).post('/inventory/stock-transfers').send({
        destinationBranchId: OTHER_BRANCH_ID,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', quantity: 50 }],
      })
      transferId = res.body.data.id
    })

    it('should approve a transfer', async () => {
      const res = await request(app).patch(`/inventory/stock-transfers/${transferId}/status`).send({
        status: 'APPROVED',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('APPROVED')
    })

    it('should complete full workflow: PENDING → APPROVED → IN_TRANSIT → RECEIVED', async () => {
      await request(app).patch(`/inventory/stock-transfers/${transferId}/status`).send({
        status: 'APPROVED',
      })

      const inTransitRes = await request(app).patch(
        `/inventory/stock-transfers/${transferId}/status`,
      ).send({ status: 'IN_TRANSIT' })
      expect(inTransitRes.status).toBe(200)
      expect(inTransitRes.body.data.status).toBe('IN_TRANSIT')

      const receivedRes = await request(app).patch(
        `/inventory/stock-transfers/${transferId}/status`,
      ).send({ status: 'RECEIVED' })
      expect(receivedRes.status).toBe(200)
      expect(receivedRes.body.data.status).toBe('RECEIVED')

      // Verify stock moved
      const originInv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: '550e8400-e29b-41d4-a716-446655470003' },
      })
      expect(originInv!.quantity_on_hand).toBe(50)

      const destInv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: OTHER_BRANCH_ID, product_id: '550e8400-e29b-41d4-a716-446655470003' },
      })
      expect(destInv!.quantity_on_hand).toBe(50)
    })

    it('should reject invalid status transition', async () => {
      const res = await request(app).patch(`/inventory/stock-transfers/${transferId}/status`).send({
        status: 'IN_TRANSIT',
      })

      expect(res.status).toBe(422)
      expect(res.body.error.message).toContain('Invalid status transition')
    })
  })

  // =======================================================================
  // STOCK COUNT
  // =======================================================================

  describe('POST /inventory/stock-counts', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
    })

    it('should create an OPEN stock count session', async () => {
      const res = await request(app).post('/inventory/stock-counts').send({
        notes: 'Monthly count',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.status).toBe('OPEN')
      expect(res.body.data.notes).toBe('Monthly count')
    })

    it('should reject second open session for same branch', async () => {
      await request(app).post('/inventory/stock-counts').send({})

      const res = await request(app).post('/inventory/stock-counts').send({})

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('already open')
    })
  })

  describe('POST /inventory/stock-counts/{sessionId}/items', () => {
    let sessionId: string

    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      const res = await request(app).post('/inventory/stock-counts').send({})
      sessionId = res.body.data.id
    })

    it('should record items and calculate variance', async () => {
      const res = await request(app).post(`/inventory/stock-counts/${sessionId}/items`).send({
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', countedQuantity: 95 }],
      })

      expect(res.status).toBe(200)
      expect(res.body.data.items).toHaveLength(1)
      expect(res.body.data.items[0].bookQuantity).toBe(100)
      expect(res.body.data.items[0].countedQuantity).toBe(95)
      expect(res.body.data.items[0].variance).toBe(-5)
    })
  })

  describe('POST /inventory/stock-counts/{sessionId}/submit', () => {
    let sessionId: string

    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      const sessionRes = await request(app).post('/inventory/stock-counts').send({})
      sessionId = sessionRes.body.data.id
      await request(app).post(`/inventory/stock-counts/${sessionId}/items`).send({
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', countedQuantity: 95 }],
      })
    })

    it('should submit the session', async () => {
      const res = await request(app).post(`/inventory/stock-counts/${sessionId}/submit`)

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('SUBMITTED')
    })
  })

  describe('POST /inventory/stock-counts/{sessionId}/approve', () => {
    let sessionId: string

    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      const sessionRes = await request(app).post('/inventory/stock-counts').send({})
      sessionId = sessionRes.body.data.id
      await request(app).post(`/inventory/stock-counts/${sessionId}/items`).send({
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', countedQuantity: 95 }],
      })
      await request(app).post(`/inventory/stock-counts/${sessionId}/submit`)
    })

    it('should approve and post inventory adjustment', async () => {
      const res = await request(app).post(`/inventory/stock-counts/${sessionId}/approve`)

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('APPROVED')

      // Verify inventory updated
      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: '550e8400-e29b-41d4-a716-446655470003' },
      })
      expect(inv!.quantity_on_hand).toBe(95)

      // Verify ledger entry
      const ledger = await prisma.inventoryLedger.findFirst({
        where: {
          tenant_id: TENANT_ID,
          movement_type: 'ADJUSTMENT',
          reference_type: 'StockCount',
        },
      })
      expect(ledger).not.toBeNull()
    })
  })

  // =======================================================================
  // INVENTORY ADJUSTMENT
  // =======================================================================

  describe('POST /inventory/adjustments', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
    })

    it('should reduce inventory for DAMAGE reason', async () => {
      const res = await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantity: 10,
        reason: 'DAMAGE',
        notes: 'Broken containers',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.quantity).toBe(-10)

      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: '550e8400-e29b-41d4-a716-446655470003' },
      })
      expect(inv!.quantity_on_hand).toBe(90)
    })

    it('should increase inventory for OPENING_BALANCE reason', async () => {
      const res = await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantity: 50,
        reason: 'OPENING_BALANCE',
        notes: 'Initial stock',
      })

      expect(res.status).toBe(201)
      expect(res.body.data.quantity).toBe(50)

      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: '550e8400-e29b-41d4-a716-446655470003' },
      })
      expect(inv!.quantity_on_hand).toBe(150)
    })

    it('should prevent negative inventory', async () => {
      const res = await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantity: 200,
        reason: 'DAMAGE',
      })

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('below zero')
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470007',
        quantity: 10,
        reason: 'DAMAGE',
      })

      expect(res.status).toBe(404)
      expect(res.body.error.message).toBe('Product not found')
    })

    it('should validate reason is one of the allowed values', async () => {
      const res = await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantity: 10,
        reason: 'INVALID_REASON',
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /inventory/adjustments', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantity: 10,
        reason: 'DAMAGE',
      })
      await request(app).post('/inventory/adjustments').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantity: 50,
        reason: 'OPENING_BALANCE',
      })
    })

    it('should list all adjustments', async () => {
      const res = await request(app).get('/inventory/adjustments')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
    })

    it('should filter by reason', async () => {
      const res = await request(app).get('/inventory/adjustments').query({ reason: 'DAMAGE' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].reason).toBe('DAMAGE')
    })
  })

  // =======================================================================
  // STOCK TRANSFER — list and get
  // =======================================================================

  describe('GET /inventory/stock-transfers', () => {
    beforeEach(async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      await request(app).post('/inventory/stock-transfers').send({
        destinationBranchId: OTHER_BRANCH_ID,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', quantity: 50 }],
      })
    })

    it('should list stock transfers', async () => {
      const res = await request(app).get('/inventory/stock-transfers')

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].status).toBe('PENDING')
      expect(res.body.data[0].items).toHaveLength(1)
    })
  })

  describe('GET /inventory/stock-transfers/{transferId}', () => {
    it('should return transfer details', async () => {
      await request(app).post('/inventory/branch').send({
        productId: '550e8400-e29b-41d4-a716-446655470003',
        quantityOnHand: 100,
      })
      const createRes = await request(app).post('/inventory/stock-transfers').send({
        destinationBranchId: OTHER_BRANCH_ID,
        items: [{ productId: '550e8400-e29b-41d4-a716-446655470003', quantity: 50 }],
      })

      const res = await request(app).get(`/inventory/stock-transfers/${createRes.body.data.id}`)

      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('PENDING')
      expect(res.body.data.items[0].quantitySent).toBe(50)
    })

    it('should return 404 for non-existent transfer', async () => {
      const res = await request(app).get('/inventory/stock-transfers/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
      expect(res.body.error.message).toBe('StockTransfer not found')
    })
  })
})
