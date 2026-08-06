import { describe, it, beforeEach, afterEach, beforeAll, afterAll, expect, vi } from 'vitest'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { prisma } from '../../database'
import { gallonRoutes } from './gallon.routes'
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
const GALLON_TYPE_ID = '550e8400-e29b-41d4-a716-446655440400'

const TRUNCATE_SQL = `TRUNCATE TABLE "gallons", "gallon_types", "audit_logs", "users", "tenants", "branches", "products", "product_categories" CASCADE`

/**
 * Creates a test Express app.  Authentication and permission middleware are
 * replaced with mocks that inject a test user context, so the controller
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

  app.use('/gallons', gallonRoutes)
  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

describe('GallonController', () => {
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
      data: { id: CATEGORY_ID, tenant_id: TENANT_ID, name: 'Gallons', is_active: true },
    })
    await prisma.product.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440410',
        tenant_id: TENANT_ID,
        category_id: CATEGORY_ID,
        sku: 'CONT-5G',
        name: '5-gallon container',
        type: 'CONTAINER',
        is_container: true,
        unit_of_measure: 'piece',
        base_price: 100,
        cost_price: 50,
        is_active: true,
      },
    })
    await prisma.gallonType.create({
      data: {
        id: GALLON_TYPE_ID,
        tenant_id: TENANT_ID,
        product_id: '550e8400-e29b-41d4-a716-446655440410',
        name: '5-Gallon Type',
      },
    })
    app = createTestApp()
  })

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "gallons", "audit_logs" CASCADE`)
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "gallons", "audit_logs" CASCADE`)
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await prisma.$disconnect()
  })

  describe('POST /gallons', () => {
    it('should create a gallon and return 201', async () => {
      const res = await request(app).post('/gallons').send({
        gallonTypeId: GALLON_TYPE_ID,
        tagCode: 'CTRL-001',
      })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.tagCode).toBe('CTRL-001')
      expect(res.body.data.status).toBe('IN_STOCK')
    })

    it('should return 400 for missing tagCode', async () => {
      const res = await request(app).post('/gallons').send({
        gallonTypeId: GALLON_TYPE_ID,
      })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('Validation failed')
    })

    it('should return 400 for missing gallonTypeId', async () => {
      const res = await request(app).post('/gallons').send({
        tagCode: 'CTRL-002',
      })

      expect(res.status).toBe(400)
    })

    it('should return 400 for invalid gallonTypeId', async () => {
      const res = await request(app).post('/gallons').send({
        gallonTypeId: 'not-a-uuid',
        tagCode: 'CTRL-003',
      })

      expect(res.status).toBe(400)
    })

    it('should return 409 for duplicate tag code', async () => {
      await prisma.gallon.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          gallon_type_id: GALLON_TYPE_ID,
          tag_code: 'CTRL-DUP',
        },
      })

      const res = await request(app).post('/gallons').send({
        gallonTypeId: GALLON_TYPE_ID,
        tagCode: 'CTRL-DUP',
      })

      expect(res.status).toBe(409)
      expect(res.body.error.message).toContain('already exists')
    })
  })

  describe('GET /gallons', () => {
    beforeEach(async () => {
      await prisma.gallon.createMany({
        data: [
          { id: '550e8400-e29b-41d4-a716-446655440301', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: GALLON_TYPE_ID, tag_code: 'CTRL-LIST-1', status: 'IN_STOCK', is_active: true },
          { id: '550e8400-e29b-41d4-a716-446655440302', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: GALLON_TYPE_ID, tag_code: 'CTRL-LIST-2', status: 'WITH_CUSTOMER', is_active: true },
          { id: '550e8400-e29b-41d4-a716-446655440303', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: GALLON_TYPE_ID, tag_code: 'CTRL-LIST-3', status: 'IN_STOCK', is_active: false },
        ],
      })
    })

    it('should return 200 with paginated list', async () => {
      const res = await request(app).get('/gallons').query({ page: 1, limit: 2 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveLength(2)
      expect(res.body.meta.total).toBe(3)
    })

    it('should search across tag code', async () => {
      const res = await request(app).get('/gallons').query({ search: 'CTRL-LIST-1' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].tagCode).toBe('CTRL-LIST-1')
    })

    it('should filter by status', async () => {
      const res = await request(app).get('/gallons').query({ status: 'IN_STOCK' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('should filter by isActive=false', async () => {
      const res = await request(app).get('/gallons').query({ isActive: 'false' })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].tagCode).toBe('CTRL-LIST-3')
    })
  })

  describe('GET /gallons/:gallonId', () => {
    it('should return 200 with gallon details', async () => {
      const created = await prisma.gallon.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440310',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          gallon_type_id: GALLON_TYPE_ID,
          tag_code: 'CTRL-GET-1',
          status: 'IN_STOCK',
          is_active: true,
        },
      })

      const res = await request(app).get(`/gallons/${created.id}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.tagCode).toBe('CTRL-GET-1')
    })

    it('should return 404 for non-existent gallon', async () => {
      const res = await request(app).get('/gallons/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
      expect(res.body.error.message).toContain('not found')
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).get('/gallons/invalid')

      expect(res.status).toBe(400)
    })
  })

  describe('PUT /gallons/:gallonId', () => {
    let gallonId: string

    beforeEach(async () => {
      const created = await prisma.gallon.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440320',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          gallon_type_id: GALLON_TYPE_ID,
          tag_code: 'CTRL-UPDATE-1',
          status: 'IN_STOCK',
          is_active: true,
        },
      })
      gallonId = created.id
    })

    it('should return 200 with updated gallon', async () => {
      const res = await request(app).put(`/gallons/${gallonId}`).send({
        tagCode: 'CTRL-UPDATED',
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.tagCode).toBe('CTRL-UPDATED')
    })

    it('should return 404 for non-existent gallon', async () => {
      const res = await request(app).put('/gallons/550e8400-e29b-41d4-a716-999999999999').send({
        tagCode: 'X',
      })

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).put('/gallons/invalid').send({
        tagCode: 'X',
      })

      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /gallons/:gallonId/status', () => {
    let gallonId: string

    beforeEach(async () => {
      const created = await prisma.gallon.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440330',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          gallon_type_id: GALLON_TYPE_ID,
          tag_code: 'CTRL-STATUS-1',
          status: 'IN_STOCK',
          is_active: true,
        },
      })
      gallonId = created.id
    })

    it('should return 200 with updated status', async () => {
      const res = await request(app).patch(`/gallons/${gallonId}/status`).send({
        status: 'WITH_CUSTOMER',
      })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('WITH_CUSTOMER')
    })

    it('should return 404 for non-existent gallon', async () => {
      const res = await request(app).patch('/gallons/550e8400-e29b-41d4-a716-999999999999/status').send({
        status: 'WITH_CUSTOMER',
      })

      expect(res.status).toBe(404)
    })

    it('should return 422 for invalid status transition', async () => {
      // First, move from IN_STOCK → WITH_CUSTOMER (valid)
      await request(app).patch(`/gallons/${gallonId}/status`).send({
        status: 'WITH_CUSTOMER',
      })

      // Then try WITH_CUSTOMER → CLEANING (invalid)
      const res = await request(app).patch(`/gallons/${gallonId}/status`).send({
        status: 'CLEANING',
      })

      expect(res.status).toBe(422)
    })
  })

  describe('DELETE /gallons/:gallonId', () => {
    it('should soft-delete and return 204', async () => {
      const created = await prisma.gallon.create({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440340',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          gallon_type_id: GALLON_TYPE_ID,
          tag_code: 'CTRL-DELETE-1',
          status: 'IN_STOCK',
          is_active: true,
        },
      })

      const res = await request(app).delete(`/gallons/${created.id}`)

      expect(res.status).toBe(204)

      // Verify soft delete in DB
      const found = await prisma.gallon.findFirst({ where: { id: created.id } })
      expect(found!.deleted_at).not.toBeNull()
    })

    it('should return 404 for non-existent gallon', async () => {
      const res = await request(app).delete('/gallons/550e8400-e29b-41d4-a716-999999999999')

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).delete('/gallons/invalid')

      expect(res.status).toBe(400)
    })
  })
})
