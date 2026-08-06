import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { gallonRepository } from './gallon.repository'
import { NotFoundError, AppError } from '../../middleware/errorHandler'
import { GallonContext, ContainerStatus } from './gallon.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001'

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
    data: { id: 'cat-gal-1', tenant_id: TENANT_ID, name: 'Gallons', is_active: true },
  })
  await prisma.product.create({
    data: {
      id: 'prod-gal-1',
      tenant_id: TENANT_ID,
      category_id: 'cat-gal-1',
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
      id: 'gt-1',
      tenant_id: TENANT_ID,
      product_id: 'prod-gal-1',
      name: '5-Gallon Type',
    },
  })
}

describe('GallonRepository', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('create', () => {
    it('should create a gallon and return the entity', async () => {
      const gallon = await gallonRepository.create({
        gallonTypeId: 'gt-1',
        tagCode: 'GAL-001',
      }, baseCtx)

      expect(gallon.id).toBeDefined()
      expect(gallon.tag_code).toBe('GAL-001')
      expect(gallon.status).toBe('IN_STOCK')
      expect(gallon.is_active).toBe(true)
      expect(gallon.tenant_id).toBe(TENANT_ID)
    })

    it('should create a gallon with full details', async () => {
      const gallon = await gallonRepository.create({
        gallonTypeId: 'gt-1',
        tagCode: 'GAL-002',
        serialNumber: 'SN-002',
        status: 'IN_STOCK',
        holderType: 'branch',
        holderId: BRANCH_ID,
        condition: 'good',
        purchasePrice: 150,
      }, baseCtx)

      expect(gallon.serial_number).toBe('SN-002')
      expect(gallon.current_holder_type).toBe('branch')
      expect(gallon.purchase_price?.toString()).toBe('150')
    })
  })

  describe('findUnique', () => {
    it('should return the gallon for a valid ID within tenant', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-003' }, baseCtx)
      const found = await gallonRepository.findUnique(created.id, baseCtx)
      expect(found).not.toBeNull()
      expect(found!.tag_code).toBe('GAL-003')
    })

    it('should return null for non-existent gallon', async () => {
      const found = await gallonRepository.findUnique('550e8400-e29b-41d4-a716-999999999999', baseCtx)
      expect(found).toBeNull()
    })

    it('should return null for soft-deleted gallon', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-004' }, baseCtx)
      await prisma.gallon.update({
        where: { id: created.id },
        data: { deleted_at: new Date() },
      })
      const found = await gallonRepository.findUnique(created.id, baseCtx)
      expect(found).toBeNull()
    })

    it('should return null for cross-tenant access', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-005' }, baseCtx)
      const otherCtx: GallonContext = { tenantId: 'other-tenant', branchId: BRANCH_ID, userId: 'test-user' }
      const found = await gallonRepository.findUnique(created.id, otherCtx)
      expect(found).toBeNull()
    })
  })

  describe('findByTagCode', () => {
    it('should return a gallon with matching tag code', async () => {
      await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-UNIQUE' }, baseCtx)
      const found = await gallonRepository.findByTagCode('GAL-UNIQUE', baseCtx)
      expect(found).not.toBeNull()
      expect(found!.tag_code).toBe('GAL-UNIQUE')
    })

    it('should return null for non-matching tag code', async () => {
      const found = await gallonRepository.findByTagCode('NON-EXISTENT', baseCtx)
      expect(found).toBeNull()
    })

    it('should respect excludeId', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-EXCLUDE' }, baseCtx)
      const found = await gallonRepository.findByTagCode('GAL-EXCLUDE', baseCtx, created.id)
      expect(found).toBeNull()
    })

    it('should isolate by tenant', async () => {
      await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-TENANT' }, baseCtx)
      const otherCtx: GallonContext = { tenantId: 'other-tenant', branchId: BRANCH_ID, userId: 'test-user' }
      const found = await gallonRepository.findByTagCode('GAL-TENANT', otherCtx)
      expect(found).toBeNull()
    })
  })

  describe('findMany', () => {
    beforeEach(async () => {
      await prisma.gallon.createMany({
        data: [
          { id: 'gal-findmany-1', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: 'gt-1', tag_code: 'FM-1', status: 'IN_STOCK', is_active: true },
          { id: 'gal-findmany-2', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: 'gt-1', tag_code: 'FM-2', status: 'WITH_CUSTOMER', is_active: true },
          { id: 'gal-findmany-3', tenant_id: TENANT_ID, branch_id: BRANCH_ID, gallon_type_id: 'gt-1', tag_code: 'FM-3', status: 'IN_STOCK', is_active: false },
        ],
      })
    })

    it('should return all non-deleted gallons by default', async () => {
      const { data, total } = await gallonRepository.findMany({}, baseCtx)
      expect(data).toHaveLength(3)
      expect(total).toBe(3)
    })

    it('should paginate results', async () => {
      const { data, total } = await gallonRepository.findMany({ page: 1, limit: 2 }, baseCtx)
      expect(data).toHaveLength(2)
      expect(total).toBe(3)
    })

    it('should filter by status', async () => {
      const { data } = await gallonRepository.findMany({ status: 'IN_STOCK' }, baseCtx)
      expect(data).toHaveLength(2)
      expect(data.every(g => g.status === 'IN_STOCK')).toBe(true)
    })

    it('should filter by isActive', async () => {
      const { data, total } = await gallonRepository.findMany({ isActive: false }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].tag_code).toBe('FM-3')
    })

    it('should search by tag code', async () => {
      const { data } = await gallonRepository.findMany({ search: 'FM-1' }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].tag_code).toBe('FM-1')
    })

    it('should scope results to tenant', async () => {
      const otherCtx: GallonContext = { tenantId: 'other-tenant', branchId: BRANCH_ID, userId: 'test-user' }
      const { data, total } = await gallonRepository.findMany({}, otherCtx)
      expect(data).toHaveLength(0)
      expect(total).toBe(0)
    })
  })

  describe('update', () => {
    it('should update gallon fields', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-UPDATE' }, baseCtx)
      const updated = await gallonRepository.update(created.id, { tagCode: 'GAL-UPDATED' }, baseCtx)
      expect(updated).not.toBeNull()
      expect(updated!.tag_code).toBe('GAL-UPDATED')
    })

    it('should return null for non-existent gallon', async () => {
      const result = await gallonRepository.update('550e8400-e29b-41d4-a716-999999999999', { tagCode: 'X' }, baseCtx)
      expect(result).toBeNull()
    })
  })

  describe('updateStatus', () => {
    it('should update the status', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-STATUS' }, baseCtx)
      const updated = await gallonRepository.updateStatus(created.id, 'WITH_CUSTOMER', baseCtx)
      expect(updated).not.toBeNull()
      expect(updated!.status).toBe('WITH_CUSTOMER')
    })
  })

  describe('remove', () => {
    it('should soft-delete a gallon', async () => {
      const created = await gallonRepository.create({ gallonTypeId: 'gt-1', tagCode: 'GAL-DELETE' }, baseCtx)
      const deleted = await gallonRepository.remove(created.id, baseCtx)
      expect(deleted).not.toBeNull()

      const found = await prisma.gallon.findUnique({ where: { id: created.id } })
      expect(found!.deleted_at).not.toBeNull()
    })

    it('should return null for non-existent gallon', async () => {
      const result = await gallonRepository.remove('550e8400-e29b-41d4-a716-999999999999', baseCtx)
      expect(result).toBeNull()
    })
  })

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => gallonRepository.validateStatusTransition('IN_STOCK', 'WITH_CUSTOMER')).not.toThrow()
      expect(() => gallonRepository.validateStatusTransition('WITH_CUSTOMER', 'IN_STOCK')).not.toThrow()
      expect(() => gallonRepository.validateStatusTransition('IN_STOCK', 'CLEANING')).not.toThrow()
      expect(() => gallonRepository.validateStatusTransition('CLEANING', 'INSPECTION')).not.toThrow()
    })

    it('should reject invalid transitions', () => {
      expect(() => gallonRepository.validateStatusTransition('WITH_CUSTOMER', 'CLEANING')).toThrow()
      expect(() => gallonRepository.validateStatusTransition('LOST', 'IN_STOCK')).toThrow()
    })

    it('should reject transitions from terminal statuses', () => {
      expect(() => gallonRepository.validateStatusTransition('RETIRED', 'IN_STOCK')).toThrow()
      expect(() => gallonRepository.validateStatusTransition('LOST', 'RETIRED')).toThrow()
    })
  })
})
