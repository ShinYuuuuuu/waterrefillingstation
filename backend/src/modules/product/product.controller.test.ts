import { describe, it, beforeEach, afterEach, afterAll, beforeAll, expect, vi } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { prisma } from '../../database'
import { productRoutes } from './product.routes'
import { notFoundHandler, globalErrorHandler } from '../../middleware/globalErrorHandler'

// Mock auth middleware to bypass JWT verification in controller tests
vi.mock('../../middleware/authJwt', () => ({
  authenticateToken: (_req: Request, _res: Response, next: NextFunction) => next(),
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440300'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440301'
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440399'

const TRUNCATE_SQL = `TRUNCATE TABLE "products", "product_categories", "branch_inventory", "inventory_ledger", "sales_transactions", "sales_transaction_items", "audit_logs", "users", "tenants", "branches" CASCADE`

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

  app.use('/products', productRoutes)
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

describe('ProductController', () => {
  let app: express.Express

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.tenant.create({
      data: { id: TENANT_ID, name: 'Test Tenant', is_active: true },
    })
    await prisma.branch.create({
      data: { id: BRANCH_ID, tenant_id: TENANT_ID, name: 'Test Branch', is_active: true },
    })
    await prisma.user.create({
      data: { id: 'test-user', tenant_id: TENANT_ID, email: 'test@test.com', full_name: 'Test User', password_hash: 'hash' },
    })
    await prisma.productCategory.create({
      data: { id: CATEGORY_ID, tenant_id: TENANT_ID, name: 'Containers', is_active: true },
    })
    app = createTestApp()
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.$disconnect()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "products", "audit_logs", "branch_inventory", "sales_transactions", "sales_transaction_items" CASCADE')
  })

  describe('POST /products', () => {
    it('should create a product and return 201', async () => {
      const res = await request(app).post('/products').send({
        categoryId: CATEGORY_ID,
        sku: 'CTRL-001',
        name: '5-Gallon Water',
        type: 'FINISHED_GOOD',
        unitOfMeasure: 'piece',
        basePrice: 55,
        costPrice: 25,
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sku).toBe('CTRL-001')
      expect(res.body.data.name).toBe('5-Gallon Water')
      expect(res.body.data.tenantId).toBe(TENANT_ID)
    })

    it('should return 400 for missing sku', async () => {
      const res = await request(app).post('/products').send({
        categoryId: CATEGORY_ID,
        name: 'No SKU',
        type: 'FINISHED_GOOD',
        unitOfMeasure: 'piece',
        basePrice: 55,
        costPrice: 25,
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('Validation failed')
    })

    it('should return 400 for missing categoryId', async () => {
      const res = await request(app).post('/products').send({
        sku: 'CTRL-003',
        name: 'No Category',
        type: 'FINISHED_GOOD',
        unitOfMeasure: 'piece',
        basePrice: 55,
        costPrice: 25,
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 for missing name', async () => {
      const res = await request(app).post('/products').send({
        categoryId: CATEGORY_ID,
        sku: 'CTRL-004',
        type: 'FINISHED_GOOD',
        unitOfMeasure: 'piece',
        basePrice: 55,
        costPrice: 25,
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 for invalid product type', async () => {
      const res = await request(app).post('/products').send({
        categoryId: CATEGORY_ID,
        sku: 'CTRL-005',
        name: 'Invalid Type',
        type: 'INVALID_TYPE',
        unitOfMeasure: 'piece',
        basePrice: 55,
        costPrice: 25,
      })

      expect(res.status).toBe(400)
    })

    it('should return 409 for duplicate SKU', async () => {
      await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-DUPE',
          name: 'Existing',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
        },
      })

      const res = await request(app).post('/products').send({
        categoryId: CATEGORY_ID,
        sku: 'SKU-DUPE',
        name: 'Duplicate',
        type: 'FINISHED_GOOD',
        unitOfMeasure: 'piece',
        basePrice: 50,
        costPrice: 25,
      })

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('already exists')
    })
  })

  describe('GET /products', () => {
    beforeEach(async () => {
      await prisma.product.createMany({
        data: [
          { id: 'ctrl-list-1', tenant_id: TENANT_ID, category_id: CATEGORY_ID, sku: 'AAA-001', name: 'Product A', type: 'FINISHED_GOOD', unit_of_measure: 'piece', base_price: 50, cost_price: 25, is_active: true },
          { id: 'ctrl-list-2', tenant_id: TENANT_ID, category_id: CATEGORY_ID, sku: 'BBB-002', name: 'Product B', type: 'RAW_MATERIAL', unit_of_measure: 'liter', base_price: 30, cost_price: 15, is_active: true },
          { id: 'ctrl-list-3', tenant_id: TENANT_ID, category_id: CATEGORY_ID, sku: 'CONT-003', name: 'Container C', type: 'CONTAINER', unit_of_measure: 'piece', base_price: 100, cost_price: 50, is_container: true, deposit_amount: 20, is_active: true },
        ],
      })
    })

    it('should return 200 with paginated list', async () => {
      const res = await request(app).get('/products').query({ page: 1, limit: 2 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.meta.page).toBe(1)
      expect(res.body.meta.limit).toBe(2)
      expect(res.body.meta.total).toBe(3)
      expect(res.body.meta.totalPages).toBe(2)
    })

    it('should search across SKU and name', async () => {
      const res = await request(app).get('/products').query({ search: 'container', isContainer: true })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].sku).toBe('CONT-003')
    })

    it('should filter by type', async () => {
      const res = await request(app).get('/products').query({ type: 'FINISHED_GOOD' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].type).toBe('FINISHED_GOOD')
    })

    it('should filter by isActive=false', async () => {
      const res = await request(app).get('/products').query({ isActive: false })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(0)
    })
  })

  describe('GET /products/:productId', () => {
    let productId: string

    beforeEach(async () => {
      const created = await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'CTRL-GET-1',
          name: 'Get Product',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 55,
          cost_price: 25,
          is_active: true,
        },
      })
      productId = created.id
    })

    it('should return 200 with product details', async () => {
      const res = await request(app).get(`/products/${productId}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.sku).toBe('CTRL-GET-1')
      expect(res.body.data.name).toBe('Get Product')
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/products/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
      expect(res.body.error.message).toContain('not found')
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).get('/products/invalid')

      expect(res.status).toBe(400)
    })
  })

  describe('PUT /products/:productId', () => {
    let productId: string

    beforeEach(async () => {
      const created = await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'CTRL-UPD-1',
          name: 'Update Product',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
          is_active: true,
        },
      })
      productId = created.id
    })

    it('should return 200 with updated product', async () => {
      const res = await request(app).put(`/products/${productId}`).send({
        name: 'Updated Name',
        basePrice: 60,
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('Updated Name')
      expect(res.body.data.basePrice).toBe(60)
    })

    it('should return 409 for duplicate SKU', async () => {
      await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-CONFLICT-CTRL',
          name: 'Existing',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
        },
      })

      const res = await request(app).put(`/products/${productId}`).send({
        sku: 'SKU-CONFLICT-CTRL',
      })

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('already exists')
    })

    it('should allow same SKU on the same product', async () => {
      const res = await request(app).put(`/products/${productId}`).send({
        name: 'No SKU Change',
      })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('No SKU Change')
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).put('/products/550e8400-e29b-41d4-a716-999999999999').send({
        name: 'Ghost',
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).put('/products/invalid').send({
        name: 'Test',
      })

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /products/:productId', () => {
    let productId: string

    beforeEach(async () => {
      const created = await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'CTRL-DEL-1',
          name: 'Delete Product',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
          is_active: true,
        },
      })
      productId = created.id
    })

    it('should soft-delete and return 204', async () => {
      const res = await request(app).delete(`/products/${productId}`)

      expect(res.status).toBe(204)

      // Verify soft delete in DB
      const raw = await prisma.product.findUnique({ where: { id: productId } })
      expect(raw!.deleted_at).not.toBeNull()
    })

    it('should return 409 when product has active inventory', async () => {
      await prisma.branchInventory.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: productId,
          quantity_on_hand: 100,
          reserved_quantity: 0,
        },
      })

      const res = await request(app).delete(`/products/${productId}`)

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('active inventory')
    })

    it('should return 409 when product has active sale references', async () => {
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-CTRL-001',
          channel: 'IN_STORE',
          subtotal: 50,
          discount_total: 0,
          tax_total: 0,
          grand_total: 50,
          status: 'COMPLETED',
          created_by: 'test-user',
          items: {
            create: [
              {
                product_id: productId,
                quantity: 1,
                unit_price: 50,
                discount_amount: 0,
                line_total: 50,
              },
            ],
          },
        },
      })

      const res = await request(app).delete(`/products/${productId}`)

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('active sale')
    })

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).delete('/products/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).delete('/products/invalid')

      expect(res.status).toBe(400)
    })
  })
})
