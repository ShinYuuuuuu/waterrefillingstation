import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { prisma } from '../../database'
import { productService } from './product.service'
import { ProductService } from './product.service'
import { NotFoundError, AppError } from '../../middleware/errorHandler'
import { ProductContext, ProductType } from './product.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440100'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440101'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440200'
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440300'
const OTHER_CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440301'

const TRUNCATE_SQL = `TRUNCATE TABLE "products", "product_categories", "branch_inventory", "inventory_ledger", "sales_transactions", "sales_transaction_items", "audit_logs", "users", "tenants", "branches" CASCADE`

const baseCtx: ProductContext = {
  tenantId: TENANT_ID,
  branchId: BRANCH_ID,
  userId: 'test-user',
}

const otherCtx: ProductContext = {
  tenantId: OTHER_TENANT_ID,
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
  await prisma.tenant.create({
    data: { id: OTHER_TENANT_ID, name: 'Other Tenant', is_active: true },
  })
  await prisma.user.create({
    data: { id: 'test-user', tenant_id: TENANT_ID, email: 'test@test.com', full_name: 'Test User', password_hash: 'hash' },
  })
  await prisma.productCategory.create({
    data: {
      id: CATEGORY_ID,
      tenant_id: TENANT_ID,
      name: 'Water Products',
      is_active: true,
    },
  })
  await prisma.productCategory.create({
    data: {
      id: OTHER_CATEGORY_ID,
      tenant_id: OTHER_TENANT_ID,
      name: 'Other Category',
      is_active: true,
    },
  })
}

describe('ProductService', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProduct', () => {
    it('should create a product and return a mapped DTO', async () => {
      const result = await productService.createProduct(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-CREATED',
          name: 'Created Product',
          type: 'FINISHED_GOOD',
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      expect(result.id).toBeDefined()
      expect(result.sku).toBe('SKU-CREATED')
      expect(result.name).toBe('Created Product')
      expect(result.type).toBe('FINISHED_GOOD')
      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.categoryId).toBe(CATEGORY_ID)
      expect(result.basePrice).toBe(55.0)
      expect(result.costPrice).toBe(25.5)
      expect(result.isContainer).toBe(false)
      expect(result.isActive).toBe(true)
      expect(result.depositAmount).toBeNull()
      expect(result.createdAt).toBeDefined()
    })

    it('should create a container product with deposit amount', async () => {
      const result = await productService.createProduct(
        {
          categoryId: CATEGORY_ID,
          sku: 'CONT-5G',
          name: '5-Gallon Container',
          type: 'CONTAINER',
          unitOfMeasure: 'piece',
          basePrice: 100,
          costPrice: 50,
          isContainer: true,
          depositAmount: 20,
        },
        baseCtx,
      )

      expect(result.isContainer).toBe(true)
      expect(result.depositAmount).toBe(20)
    })

    it('should reject duplicate SKU within the same tenant', async () => {
      await productService.createProduct(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-DUP',
          name: 'Original',
          type: 'FINISHED_GOOD',
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      await expect(
        productService.createProduct(
          {
            categoryId: CATEGORY_ID,
            sku: 'SKU-DUP',
            name: 'Duplicate',
            type: 'FINISHED_GOOD',
            unitOfMeasure: 'piece',
            basePrice: 50,
            costPrice: 25,
          },
          baseCtx,
        ),
      ).rejects.toThrow('already exists')
    })

    it('should allow same SKU in a different tenant', async () => {
      await productService.createProduct(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-TENANT-1',
          name: 'Product T1',
          type: 'FINISHED_GOOD',
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      // Same SKU, different tenant — should not throw
      const result = await productService.createProduct(
        {
          categoryId: OTHER_CATEGORY_ID,
          sku: 'SKU-TENANT-1',
          name: 'Product T2',
          type: 'FINISHED_GOOD',
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        otherCtx,
      )

      expect(result.sku).toBe('SKU-TENANT-1')
      expect(result.tenantId).toBe(OTHER_TENANT_ID)
    })

    it('should create an audit log entry on successful creation', async () => {
      await productService.createProduct(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-AUDIT',
          name: 'Audit Product',
          type: 'FINISHED_GOOD',
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      const auditLog = await prisma.auditLog.findFirst({
        where: { tenant_id: TENANT_ID, action: 'CREATE', entity_type: 'Product' },
      })

      expect(auditLog).not.toBeNull()
      expect(auditLog!.user_id).toBe('test-user')
    })
  })

  describe('getProduct', () => {
    it('should return a mapped DTO', async () => {
      const created = await prisma.product.create({
        data: {
          id: 'get-prod-1',
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-GET',
          name: 'Get Product',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 55,
          cost_price: 25,
          is_container: false,
          is_active: true,
        },
      })

      const result = await productService.getProduct(created.id, baseCtx)
      expect(result.id).toBe('get-prod-1')
      expect(result.sku).toBe('SKU-GET')
      expect(result.basePrice).toBe(55)
      expect(result.isActive).toBe(true)
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        productService.getProduct('550e8400-e29b-41d4-a716-999999999999', baseCtx),
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError for cross-tenant access', async () => {
      const created = await prisma.product.create({
        data: {
          id: 'get-prod-2',
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-GET-2',
          name: 'Get Product 2',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 55,
          cost_price: 25,
          is_container: false,
          is_active: true,
        },
      })

      await expect(
        productService.getProduct(created.id, otherCtx),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getProducts', () => {
    beforeEach(async () => {
      await prisma.product.createMany({
        data: [
          { id: 'list-1', tenant_id: TENANT_ID, category_id: CATEGORY_ID, sku: 'AAA-001', name: 'Product A', type: 'FINISHED_GOOD', unit_of_measure: 'piece', base_price: 50, cost_price: 25, is_active: true },
          { id: 'list-2', tenant_id: TENANT_ID, category_id: CATEGORY_ID, sku: 'BBB-002', name: 'Product B', type: 'RAW_MATERIAL', unit_of_measure: 'liter', base_price: 30, cost_price: 15, is_active: false },
          { id: 'list-3', tenant_id: TENANT_ID, category_id: CATEGORY_ID, sku: 'CONT-003', name: 'Container C', type: 'CONTAINER', unit_of_measure: 'piece', base_price: 100, cost_price: 50, is_container: true, deposit_amount: 20, is_active: true },
        ],
      })
    })

    it('should return paginated results with metadata', async () => {
      const result = await productService.getProducts({ page: 1, limit: 2 }, baseCtx)

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(2)
      expect(result.meta.total).toBe(3)
      expect(result.meta.totalPages).toBe(2)
      expect(result.data).toHaveLength(2)
    })

    it('should search across name and SKU', async () => {
      const result = await productService.getProducts({ search: 'Product' }, baseCtx)

      expect(result.data).toHaveLength(2)
      expect(result.data.map((p) => p.name)).toContain('Product A')
      expect(result.data.map((p) => p.name)).toContain('Product B')
    })

    it('should filter by type', async () => {
      const result = await productService.getProducts({ type: 'RAW_MATERIAL' }, baseCtx)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].type).toBe('RAW_MATERIAL')
    })

    it('should filter by isActive', async () => {
      const result = await productService.getProducts({ isActive: true }, baseCtx)

      expect(result.data).toHaveLength(2)
    })

    it('should filter by isContainer', async () => {
      const result = await productService.getProducts({ isContainer: true }, baseCtx)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].isContainer).toBe(true)
    })

    it('should scope results to tenant', async () => {
      const result = await productService.getProducts({}, otherCtx)

      expect(result.data).toHaveLength(0)
      expect(result.meta.total).toBe(0)
    })

    it('should enforce a maximum limit of 100', async () => {
      const result = await productService.getProducts({ limit: 200 }, baseCtx)

      expect(result.meta.limit).toBe(100)
    })
  })

  describe('updateProduct', () => {
    let existingId: string

    beforeEach(async () => {
      const created = await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-UPD',
          name: 'Update Me',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
          is_active: true,
        },
      })
      existingId = created.id
    })

    it('should update product fields and return mapped DTO', async () => {
      const result = await productService.updateProduct(
        existingId,
        { name: 'Updated Name', basePrice: 60, costPrice: 30 },
        baseCtx,
      )

      expect(result.name).toBe('Updated Name')
      expect(result.basePrice).toBe(60)
      expect(result.costPrice).toBe(30)
    })

    it('should create a before/after audit log entry', async () => {
      await productService.updateProduct(
        existingId,
        { name: 'Audit Update' },
        baseCtx,
      )

      const auditLog = await prisma.auditLog.findFirst({
        where: { tenant_id: TENANT_ID, action: 'UPDATE', entity_type: 'Product' },
        orderBy: { created_at: 'desc' },
      })

      expect(auditLog).not.toBeNull()
      expect(auditLog!.entity_id).toBe(existingId)
      const beforeData = auditLog!.before_data as { data: { name: string } }
      const afterData = auditLog!.after_data as { data: { name: string } }
      expect(beforeData.data.name).toBe('Update Me')
      expect(afterData.data.name).toBe('Audit Update')
    })

    it('should allow same SKU update on the same record', async () => {
      // Updating the same product with its own SKU should not conflict
      const result = await productService.updateProduct(
        existingId,
        { name: 'No SKU Change' },
        baseCtx,
      )
      expect(result.name).toBe('No SKU Change')
    })

    it('should reject SKU that is already in use by another product', async () => {
      await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-CONFLICT',
          name: 'Existing',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
        },
      })

      await expect(
        productService.updateProduct(
          existingId,
          { sku: 'SKU-CONFLICT' },
          baseCtx,
        ),
      ).rejects.toThrow('already exists')
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        productService.updateProduct(
          '550e8400-e29b-41d4-a716-999999999999',
          { name: 'Ghost' },
          baseCtx,
        ),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteProduct', () => {
    let existingId: string

    beforeEach(async () => {
      const created = await prisma.product.create({
        data: {
          tenant_id: TENANT_ID,
          category_id: CATEGORY_ID,
          sku: 'SKU-DELETE-TEST',
          name: 'Delete Me',
          type: 'FINISHED_GOOD',
          unit_of_measure: 'piece',
          base_price: 50,
          cost_price: 25,
          is_active: true,
        },
      })
      existingId = created.id
    })

    it('should soft-delete a product with zero inventory', async () => {
      await productService.deleteProduct(existingId, baseCtx)

      const raw = await prisma.product.findUnique({ where: { id: existingId } })
      expect(raw!.deleted_at).not.toBeNull()
    })

    it('should create a DELETE audit log entry', async () => {
      await productService.deleteProduct(existingId, baseCtx)

      const auditLog = await prisma.auditLog.findFirst({
        where: { tenant_id: TENANT_ID, action: 'DELETE', entity_type: 'Product' },
      })

      expect(auditLog).not.toBeNull()
      expect(auditLog!.entity_id).toBe(existingId)
    })

    it('should reject deletion when product has active inventory', async () => {
      await prisma.branchInventory.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: existingId,
          quantity_on_hand: 100,
          reserved_quantity: 0,
        },
      })

      await expect(
        productService.deleteProduct(existingId, baseCtx),
      ).rejects.toThrow('active inventory')
    })

    it('should reject deletion when product has active sale references', async () => {
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-SVC-001',
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
                product_id: existingId,
                quantity: 1,
                unit_price: 50,
                discount_amount: 0,
                line_total: 50,
              },
            ],
          },
        },
      })

      await expect(
        productService.deleteProduct(existingId, baseCtx),
      ).rejects.toThrow('active sale')
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        productService.deleteProduct('550e8400-e29b-41d4-a716-999999999999', baseCtx),
      ).rejects.toThrow(NotFoundError)
    })
  })
})
