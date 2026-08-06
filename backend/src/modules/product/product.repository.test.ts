import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { productRepository } from './product.repository'
import { ProductContext, ProductType } from './product.types'
import { NotFoundError } from '../../middleware/errorHandler'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440002'
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440099'

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
}

describe('ProductRepository', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('create', () => {
    it('should create a product and return the entity', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-001',
          name: '5-Gallon Water',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      expect(created.id).toBeDefined()
      expect(created.sku).toBe('SKU-001')
      expect(created.name).toBe('5-Gallon Water')
      expect(created.type).toBe('FINISHED_GOOD')
      expect(created.is_container).toBe(false)
      expect(created.is_active).toBe(true)
      expect(created.tenant_id).toBe(TENANT_ID)
      expect(created.category_id).toBe(CATEGORY_ID)
      expect(created.created_at).toBeInstanceOf(Date)
      expect(created.updated_at).toBeInstanceOf(Date)
      expect(created.deleted_at).toBeNull()
    })

    it('should create a container product with deposit amount', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'CONT-5G',
          name: '5-Gallon Container',
          type: 'CONTAINER' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 100,
          costPrice: 50,
          isContainer: true,
          depositAmount: 20,
        },
        baseCtx,
      )

      expect(created.is_container).toBe(true)
      expect(Number(created.deposit_amount)).toBe(20)
    })
  })

  describe('findUnique', () => {
    it('should return the product for a valid ID within tenant', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-001',
          name: '5-Gallon Water',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      const found = await productRepository.findUnique(created.id, baseCtx)
      expect(found).not.toBeNull()
      expect(found!.sku).toBe('SKU-001')
    })

    it('should return null for cross-tenant access', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-001',
          name: '5-Gallon Water',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      const found = await productRepository.findUnique(created.id, otherCtx)
      expect(found).toBeNull()
    })

    it('should return null for soft-deleted products', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-001',
          name: '5-Gallon Water',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      await productRepository.remove(created.id, baseCtx)

      const found = await productRepository.findUnique(created.id, baseCtx)
      expect(found).toBeNull()
    })
  })

  describe('findBySku', () => {
    it('should return a product with matching SKU', async () => {
      await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-UNIQUE',
          name: 'Unique Product',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      const found = await productRepository.findBySku('SKU-UNIQUE', baseCtx)
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Unique Product')
    })

    it('should return null for non-matching SKU', async () => {
      const found = await productRepository.findBySku('NONEXISTENT', baseCtx)
      expect(found).toBeNull()
    })

    it('should respect excludeId', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-EXCLUDE',
          name: 'Exclude Product',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      const found = await productRepository.findBySku('SKU-EXCLUDE', baseCtx, created.id)
      expect(found).toBeNull()
    })

    it('should isolate by tenant', async () => {
      await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-TENANT',
          name: 'Tenant Product',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 55.0,
          costPrice: 25.5,
        },
        baseCtx,
      )

      const found = await productRepository.findBySku('SKU-TENANT', otherCtx)
      expect(found).toBeNull()
    })
  })

  describe('findMany', () => {
    beforeEach(async () => {
      await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-A001',
          name: 'Product A',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
          isContainer: false,
        },
        baseCtx,
      )
      await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'CONT-A002',
          name: 'Container A',
          type: 'CONTAINER' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 100,
          costPrice: 50,
          isContainer: true,
          depositAmount: 20,
        },
        baseCtx,
      )
      await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-A003',
          name: 'Product B (inactive)',
          type: 'RAW_MATERIAL' as ProductType,
          unitOfMeasure: 'liter',
          basePrice: 30,
          costPrice: 15,
          isActive: false,
        },
        baseCtx,
      )
    })

    it('should return all non-deleted products by default', async () => {
      const { data, total } = await productRepository.findMany({}, baseCtx)
      expect(data).toHaveLength(3)
      expect(total).toBe(3)
    })

    it('should paginate results', async () => {
      const { data, total } = await productRepository.findMany({ page: 1, limit: 2 }, baseCtx)
      expect(data).toHaveLength(2)
      expect(total).toBe(3)
    })

    it('should search by SKU, name, and description', async () => {
      const { data } = await productRepository.findMany({ search: 'container' }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].sku).toBe('CONT-A002')
    })

    it('should search case-insensitively', async () => {
      const { data } = await productRepository.findMany({ search: 'PRODUCT' }, baseCtx)
      expect(data).toHaveLength(2)
    })

    it('should filter by type', async () => {
      const { data } = await productRepository.findMany({ type: 'FINISHED_GOOD' }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].sku).toBe('SKU-A001')
    })

    it('should filter by isActive', async () => {
      const { data } = await productRepository.findMany({ isActive: false }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].sku).toBe('SKU-A003')
    })

    it('should filter by isContainer', async () => {
      const { data } = await productRepository.findMany({ isContainer: true }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].is_container).toBe(true)
    })

    it('should filter by category', async () => {
      const { data } = await productRepository.findMany({ category: CATEGORY_ID }, baseCtx)
      expect(data).toHaveLength(3)
    })

    it('should sort by name ascending', async () => {
      const { data } = await productRepository.findMany({ sortBy: 'name', sortOrder: 'asc' }, baseCtx)
      expect(data[0].name).toBe('Container A')
      expect(data[2].name).toBe('Product B (inactive)')
    })

    it('should sort by sku descending', async () => {
      const { data } = await productRepository.findMany({ sortBy: 'sku', sortOrder: 'desc' }, baseCtx)
      expect(data[0].sku).toBe('SKU-A003')
      expect(data[2].sku).toBe('CONT-A002')
    })

    it('should scope results to tenant', async () => {
      const { data, total } = await productRepository.findMany({}, otherCtx)
      expect(data).toHaveLength(0)
      expect(total).toBe(0)
    })
  })

  describe('update', () => {
    it('should update product fields', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-UPDATE',
          name: 'Original Name',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      const updated = await productRepository.update(
        created.id,
        { name: 'Updated Name', basePrice: 60, isActive: false },
        baseCtx,
      )

      expect(updated.name).toBe('Updated Name')
      expect(Number(updated.base_price)).toBe(60)
      expect(updated.is_active).toBe(false)
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        productRepository.update(
          '550e8400-e29b-41d4-a716-999999999999',
          { name: 'Ghost' },
          baseCtx,
        ),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('remove', () => {
    it('should soft-delete a product', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-DELETE',
          name: 'To Delete',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      const deleted = await productRepository.remove(created.id, baseCtx)
      expect(deleted.deleted_at).not.toBeNull()

      // Verify it's excluded from findMany
      const { data } = await productRepository.findMany({}, baseCtx)
      expect(data).toHaveLength(0)
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        productRepository.remove('550e8400-e29b-41d4-a716-999999999999', baseCtx),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('hasActiveInventory', () => {
    it('should return false when no inventory exists', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-NOINV',
          name: 'No Inventory',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      const result = await productRepository.hasActiveInventory(created.id, baseCtx)
      expect(result).toBe(false)
    })

    it('should return true when inventory exists with quantity_on_hand > 0', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-WITH-INV',
          name: 'With Inventory',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      await prisma.branchInventory.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: created.id,
          quantity_on_hand: 100,
          reserved_quantity: 0,
        },
      })

      const result = await productRepository.hasActiveInventory(created.id, baseCtx)
      expect(result).toBe(true)
    })

    it('should return true when inventory has reserved_quantity > 0', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-RESERVED',
          name: 'Reserved',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      await prisma.branchInventory.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: created.id,
          quantity_on_hand: 0,
          reserved_quantity: 5,
        },
      })

      const result = await productRepository.hasActiveInventory(created.id, baseCtx)
      expect(result).toBe(true)
    })

    it('should return false when inventory has zero quantities', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-ZERO',
          name: 'Zero Stock',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      await prisma.branchInventory.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          product_id: created.id,
          quantity_on_hand: 0,
          reserved_quantity: 0,
        },
      })

      const result = await productRepository.hasActiveInventory(created.id, baseCtx)
      expect(result).toBe(false)
    })
  })

  describe('hasActiveSaleReferences', () => {
    it('should return false when no sale references exist', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-NOSALE',
          name: 'No Sales',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      const result = await productRepository.hasActiveSaleReferences(created.id, baseCtx)
      expect(result).toBe(false)
    })

    it('should return true when product is in a completed sales transaction', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-WITH-SALE',
          name: 'With Sales',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      const branchId = BRANCH_ID
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: branchId,
          invoice_number: 'INV-TEST-001',
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
                product_id: created.id,
                quantity: 1,
                unit_price: 50,
                discount_amount: 0,
                line_total: 50,
              },
            ],
          },
        },
      })

      const result = await productRepository.hasActiveSaleReferences(created.id, baseCtx)
      expect(result).toBe(true)
    })

    it('should return false when product is only in voided transactions', async () => {
      const created = await productRepository.create(
        {
          categoryId: CATEGORY_ID,
          sku: 'SKU-VOIDED',
          name: 'Voided Sale',
          type: 'FINISHED_GOOD' as ProductType,
          unitOfMeasure: 'piece',
          basePrice: 50,
          costPrice: 25,
        },
        baseCtx,
      )

      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-TEST-002',
          channel: 'IN_STORE',
          subtotal: 50,
          discount_total: 0,
          tax_total: 0,
          grand_total: 50,
          status: 'VOID',
          voided_at: new Date(),
          created_by: 'test-user',
          items: {
            create: [
              {
                product_id: created.id,
                quantity: 1,
                unit_price: 50,
                discount_amount: 0,
                line_total: 50,
              },
            ],
          },
        },
      })

      const result = await productRepository.hasActiveSaleReferences(created.id, baseCtx)
      expect(result).toBe(false)
    })
  })
})
