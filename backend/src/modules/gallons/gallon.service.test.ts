import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { gallonService } from './gallon.service'
import { NotFoundError, AppError } from '../../middleware/errorHandler'
import { GallonContext } from './gallon.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440100'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440101'

const TRUNCATE_SQL = `TRUNCATE TABLE "gallons", "gallon_types", "audit_logs", "users", "tenants", "branches", "products", "product_categories" CASCADE`

const baseCtx: GallonContext = {
  tenantId: TENANT_ID,
  branchId: BRANCH_ID,
  userId: 'test-user',
}

async function setupPrerequisites() {
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
    data: { id: 'cat-svc-1', tenant_id: TENANT_ID, name: 'Gallons', is_active: true },
  })
  await prisma.product.create({
    data: {
      id: 'prod-svc-1',
      tenant_id: TENANT_ID,
      category_id: 'cat-svc-1',
      sku: 'CONT-5G',
      name: '5-gallon container',
      type: 'CONTAINER',
      is_container: true,
      unit_of_measure: 'pc',
      base_price: 100,
      cost_price: 50,
      is_active: true,
    },
  })
  await prisma.gallonType.create({
    data: {
      id: 'gt-svc-1',
      tenant_id: TENANT_ID,
      product_id: 'prod-svc-1',
      name: '5-Gallon Type',
    },
  })
}

describe('GallonService', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('createGallon', () => {
    it('should create a gallon and return a mapped DTO', async () => {
      const result = await gallonService.createGallon({
        gallonTypeId: 'gt-svc-1',
        tagCode: 'SVC-001',
      }, baseCtx)

      expect(result.id).toBeDefined()
      expect(result.tagCode).toBe('SVC-001')
      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.branchId).toBe(BRANCH_ID)
      expect(result.isActive).toBe(true)
    })

    it('should reject duplicate tag code within the same tenant', async () => {
      await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-DUP' }, baseCtx)

      await expect(
        gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-DUP' }, baseCtx),
      ).rejects.toThrow('already exists')
    })

    it('should allow same tag code in a different tenant', async () => {
      await prisma.tenant.create({
        data: { id: 'other-tenant-svc', name: 'Other', is_active: true },
      })
      await prisma.branch.create({
        data: { id: 'other-branch-svc', tenant_id: 'other-tenant-svc', name: 'Other Branch', is_active: true },
      })
      await prisma.user.create({
        data: { id: 'other-user-svc', tenant_id: 'other-tenant-svc', email: 'other@test.com', full_name: 'Other User', password_hash: 'hash' },
      })

      const otherCtx: GallonContext = {
        tenantId: 'other-tenant-svc',
        branchId: 'other-branch-svc',
        userId: 'other-user-svc',
      }

      await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-SAME-A' }, baseCtx)
      const result = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-SAME-B' }, otherCtx)
      expect(result.tagCode).toBe('SVC-SAME-B')
    })

    it('should create an audit log entry on successful creation', async () => {
      const result = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-AUDIT' }, baseCtx)

      const auditLog = await prisma.auditLog.findFirst({
        where: { entity_id: result.id, action: 'CREATE' },
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog!.entity_type).toBe('Gallon')
    })
  })

  describe('getGallon', () => {
    it('should return a mapped DTO', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-GET-1' }, baseCtx)
      const result = await gallonService.getGallon(created.id, baseCtx)

      expect(result.tagCode).toBe('SVC-GET-1')
    })

    it('should throw NotFoundError for non-existent gallon', async () => {
      await expect(
        gallonService.getGallon('550e8400-e29b-41d4-a716-999999999999', baseCtx),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getGallons', () => {
    beforeEach(async () => {
      await prisma.gallon.createMany({
        data: [
          { id: 'gal-svc-list-1', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: 'gt-svc-1', tag_code: 'SVC-LIST-1', status: 'IN_STOCK', is_active: true },
          { id: 'gal-svc-list-2', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: 'gt-svc-1', tag_code: 'SVC-LIST-2', status: 'WITH_CUSTOMER', is_active: true },
          { id: 'gal-svc-list-3', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: 'gt-svc-1', tag_code: 'SVC-LIST-3', status: 'IN_STOCK', is_active: false },
        ],
      })
    })

    it('should return paginated results with metadata', async () => {
      const result = await gallonService.getGallons({ page: 1, limit: 2 }, baseCtx)

      expect(result.data).toHaveLength(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(2)
      expect(result.meta.total).toBe(3)
      expect(result.meta.totalPages).toBe(2)
    })

    it('should search across tag code', async () => {
      const result = await gallonService.getGallons({ search: 'SVC-LIST-1' }, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].tagCode).toBe('SVC-LIST-1')
    })

    it('should filter by status', async () => {
      const result = await gallonService.getGallons({ status: 'IN_STOCK' }, baseCtx)
      expect(result.data).toHaveLength(2)
    })

    it('should filter by isActive', async () => {
      const result = await gallonService.getGallons({ isActive: false }, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].tagCode).toBe('SVC-LIST-3')
    })

    it('should scope results to tenant', async () => {
      const otherCtx: GallonContext = { tenantId: 'non-existent-tenant', branchId: BRANCH_ID, userId: 'test-user' }
      const result = await gallonService.getGallons({}, otherCtx)
      expect(result.data).toHaveLength(0)
      expect(result.meta.total).toBe(0)
    })
  })

  describe('updateGallon', () => {
    it('should update gallon fields and return mapped DTO', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-UPDATE-1' }, baseCtx)
      const result = await gallonService.updateGallon(created.id, { tagCode: 'SVC-UPDATED' }, baseCtx)

      expect(result.tagCode).toBe('SVC-UPDATED')
    })

    it('should create a before/after audit log entry', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-AUDIT-UPD' }, baseCtx)
      await gallonService.updateGallon(created.id, { tagCode: 'SVC-AUDIT-UPD-2' }, baseCtx)

      const auditLog = await prisma.auditLog.findFirst({
        where: { entity_id: created.id, action: 'UPDATE' },
      })
      expect(auditLog).not.toBeNull()
    })

    it('should allow same tag code update on the same record', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-SAME' }, baseCtx)
      const result = await gallonService.updateGallon(created.id, { tagCode: 'SVC-SAME' }, baseCtx)
      expect(result.tagCode).toBe('SVC-SAME')
    })

    it('should reject tag code that is already in use by another gallon', async () => {
      const g1 = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-CONFLICT-1' }, baseCtx)
      await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-CONFLICT-2' }, baseCtx)

      await expect(
        gallonService.updateGallon(g1.id, { tagCode: 'SVC-CONFLICT-2' }, baseCtx),
      ).rejects.toThrow('already exists')
    })

    it('should throw NotFoundError for non-existent gallon', async () => {
      await expect(
        gallonService.updateGallon('550e8400-e29b-41d4-a716-999999999999', { tagCode: 'X' }, baseCtx),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject invalid status transitions', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-TRNS' }, baseCtx)
      await gallonService.updateStatus(created.id, 'WITH_CUSTOMER', baseCtx)

      await expect(
        gallonService.updateGallon(created.id, { status: 'CLEANING' }, baseCtx),
      ).rejects.toThrow()
    })
  })

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-STS-1' }, baseCtx)
      const result = await gallonService.updateStatus(created.id, 'WITH_CUSTOMER', baseCtx)
      expect(result.status).toBe('WITH_CUSTOMER')
    })

    it('should throw NotFoundError for non-existent gallon', async () => {
      await expect(
        gallonService.updateStatus('550e8400-e29b-41d4-a716-999999999999', 'WITH_CUSTOMER', baseCtx),
      ).rejects.toThrow(NotFoundError)
    })

    it('should reject transition from terminal status', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-TERM' }, baseCtx)
      await gallonService.updateStatus(created.id, 'RETIRED', baseCtx)

      await expect(
        gallonService.updateStatus(created.id, 'IN_STOCK', baseCtx),
      ).rejects.toThrow()
    })

    it('should create an audit log entry on status change', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-STS-AUDIT' }, baseCtx)
      await gallonService.updateStatus(created.id, 'WITH_CUSTOMER', baseCtx)

      const auditLog = await prisma.auditLog.findFirst({
        where: { entity_id: created.id, action: 'STATUS_CHANGE' },
      })
      expect(auditLog).not.toBeNull()
    })
  })

  describe('deleteGallon', () => {
    it('should soft-delete a gallon', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-DEL-1' }, baseCtx)
      await gallonService.deleteGallon(created.id, baseCtx)

      const deleted = await prisma.gallon.findFirst({
        where: { id: created.id },
      })
      expect(deleted!.deleted_at).not.toBeNull()
    })

    it('should throw NotFoundError for non-existent gallon', async () => {
      await expect(
        gallonService.deleteGallon('550e8400-e29b-41d4-a716-999999999999', baseCtx),
      ).rejects.toThrow(NotFoundError)
    })

    it('should create an audit log entry on deletion', async () => {
      const created = await gallonService.createGallon({ gallonTypeId: 'gt-svc-1', tagCode: 'SVC-DEL-AUDIT' }, baseCtx)
      await gallonService.deleteGallon(created.id, baseCtx)

      const auditLog = await prisma.auditLog.findFirst({
        where: { entity_id: created.id, action: 'DELETE' },
      })
      expect(auditLog).not.toBeNull()
    })
  })
})
