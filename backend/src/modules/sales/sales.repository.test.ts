import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { saleRepository } from './sales.repository'
import { SaleContext } from './sales.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440800'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440801'
const OTHER_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440802'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440900'

const TRUNCATE_SQL = `TRUNCATE TABLE "sales_transactions", "sales_transaction_items", "payments", "audit_logs", "branch_inventory", "inventory_ledger", "products", "product_categories", "tenants", "branches", "users", "sales_transaction_container_exchanges", "sales_transaction_voids" CASCADE`

const baseCtx: SaleContext = {
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
  await prisma.branch.create({
    data: { id: OTHER_BRANCH_ID, tenant_id: TENANT_ID, name: 'Other Branch', is_active: true },
  })
  await prisma.tenant.create({
    data: { id: OTHER_TENANT_ID, name: 'Other Tenant', is_active: true },
  })
  await prisma.user.create({
    data: { id: 'test-user', tenant_id: TENANT_ID, email: 'test@test.com', full_name: 'Test User', password_hash: 'hash' },
  })

  await prisma.productCategory.create({
    data: { id: 'sale-cat-1', tenant_id: TENANT_ID, name: 'Water Products', is_active: true },
  })
  await prisma.product.create({
    data: {
      id: 'sale-prod-1',
      tenant_id: TENANT_ID,
      category_id: 'sale-cat-1',
      sku: 'SALE-REFILL',
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
      id: 'sale-prod-2',
      tenant_id: TENANT_ID,
      category_id: 'sale-cat-1',
      sku: 'SALE-GALLON',
      name: '5-Gallon Purified Water',
      type: 'FINISHED_GOOD',
      unit_of_measure: 'pc',
      base_price: 55,
      cost_price: 25,
      is_active: true,
    },
  })
  await prisma.product.create({
    data: {
      id: 'sale-prod-3',
      tenant_id: TENANT_ID,
      category_id: 'sale-cat-1',
      sku: 'SALE-EMPTY',
      name: 'Empty Gallon',
      type: 'CONTAINER',
      unit_of_measure: 'pc',
      base_price: 100,
      cost_price: 50,
      is_active: true,
    },
  })

  await prisma.branchInventory.create({
    data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'sale-prod-1', quantity_on_hand: 100, reserved_quantity: 0 },
  })
  await prisma.branchInventory.create({
    data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'sale-prod-2', quantity_on_hand: 50, reserved_quantity: 0 },
  })
  await prisma.branchInventory.create({
    data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'sale-prod-3', quantity_on_hand: 30, reserved_quantity: 0 },
  })
}

describe('SaleRepository', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('findMany', () => {
    it('should return an empty list when no sales exist', async () => {
      const result = await saleRepository.findMany({}, baseCtx)
      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should return paginated sales', async () => {
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-002',
          channel: 'DELIVERY',
          subtotal: 55,
          discount_total: 0,
          tax_total: 0,
          grand_total: 55,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const result = await saleRepository.findMany({}, baseCtx)
      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should filter by channel', async () => {
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-002',
          channel: 'DELIVERY',
          subtotal: 55,
          discount_total: 0,
          tax_total: 0,
          grand_total: 55,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const result = await saleRepository.findMany({ channel: 'IN_STORE' }, baseCtx)
      expect(result.data).toHaveLength(1)
      expect((result.data[0] as any).channel).toBe('IN_STORE')
    })

    it('should filter by status', async () => {
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-002',
          channel: 'IN_STORE',
          subtotal: 55,
          discount_total: 0,
          tax_total: 0,
          grand_total: 55,
          status: 'VOID',
          created_by: 'test-user',
        },
      })

      const result = await saleRepository.findMany({ status: 'COMPLETED' }, baseCtx)
      expect(result.data).toHaveLength(1)
    })

    it('should scope results to tenant', async () => {
      await prisma.salesTransaction.create({
        data: {
          tenant_id: OTHER_TENANT_ID,
          branch_id: OTHER_BRANCH_ID,
          invoice_number: 'INV-OTHER',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const result = await saleRepository.findMany({}, baseCtx)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('findUnique', () => {
    it('should return a sale by id', async () => {
      const sale = await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const result = await saleRepository.findUnique(sale.id, baseCtx)
      expect(result).not.toBeNull()
      expect((result as any).invoice_number).toBe('INV-001')
    })

    it('should return null for non-existent id', async () => {
      const result = await saleRepository.findUnique('non-existent', baseCtx)
      expect(result).toBeNull()
    })

    it('should not return sales from other tenants', async () => {
      const sale = await prisma.salesTransaction.create({
        data: {
          tenant_id: OTHER_TENANT_ID,
          branch_id: OTHER_BRANCH_ID,
          invoice_number: 'INV-OTHER',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const result = await saleRepository.findUnique(sale.id, baseCtx)
      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a sale with items and payments', async () => {
      const sale = await saleRepository.create(
        {
          channel: 'IN_STORE',
          items: [
            { productId: 'sale-prod-1', productName: 'Water Refill', quantity: 2, unitPrice: 20 },
            { productId: 'sale-prod-2', productName: '5-Gallon Purified Water', quantity: 1, unitPrice: 55 },
          ],
          payments: [{ amount: 95, method: 'CASH' }],
        },
        baseCtx,
      )

      expect(sale.id).toBeDefined()
      expect(sale.invoice_number).toBeDefined()
      expect(sale.status).toBe('COMPLETED')
      expect((sale as any).items).toHaveLength(2)
      expect((sale as any).payments).toHaveLength(1)
    })

    it('should generate unique invoice numbers', async () => {
      const sale1 = await saleRepository.create(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'sale-prod-1', productName: 'Water Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const sale2 = await saleRepository.create(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'sale-prod-1', productName: 'Water Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      expect(sale1.invoice_number).not.toBe(sale2.invoice_number)
    })
  })

  describe('update', () => {
    it('should update a sale', async () => {
      const sale = await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const updated = await saleRepository.update(sale.id, { channel: 'DELIVERY', notes: 'Updated' }, baseCtx)
      expect((updated as any).channel).toBe('DELIVERY')
      expect((updated as any).notes).toBe('Updated')
    })
  })

  describe('remove', () => {
    it('should soft-delete a sale', async () => {
      const sale = await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      await saleRepository.remove(sale.id, baseCtx)

      const result = await prisma.salesTransaction.findFirst({
        where: { id: sale.id },
      })
      expect((result as any).deleted_at).not.toBeNull()
    })
  })

  describe('recordPayment', () => {
    it('should record a payment', async () => {
      const sale = await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const payment = await saleRepository.recordPayment(sale.id, { amount: 20, method: 'CASH' }, baseCtx)
      expect(Number((payment as any).amount)).toBe(20)
      expect((payment as any).payment_method).toBe('CASH')
    })
  })

  describe('voidSale', () => {
    it('should void a sale and set void fields', async () => {
      const sale = await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
        },
      })

      const voided = await saleRepository.voidSale(sale.id, { reason: 'Customer changed mind' }, baseCtx)
      expect((voided as any).status).toBe('VOID')
      expect((voided as any).void_reason).toBe('Customer changed mind')
      expect((voided as any).voided_by).toBe('test-user')
    })
  })

  describe('getDailySummary', () => {
    it('should return daily summary', async () => {
      const today = new Date().toISOString().slice(0, 10)

      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'COMPLETED',
          created_by: 'test-user',
          payments: {
            create: { tenant_id: TENANT_ID, payment_method: 'CASH', amount: 20, status: 'CONFIRMED', collected_by: 'test-user' },
          },
        },
      })
      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-002',
          channel: 'DELIVERY',
          subtotal: 55,
          discount_total: 0,
          tax_total: 0,
          grand_total: 55,
          status: 'COMPLETED',
          created_by: 'test-user',
          payments: {
            create: { tenant_id: TENANT_ID, payment_method: 'CASH', amount: 55, status: 'CONFIRMED', collected_by: 'test-user' },
          },
        },
      })

      const summary = await saleRepository.getDailySummary(today, null, baseCtx)
      expect(summary.totalTransactions).toBe(2)
      expect(summary.totalGrandTotal).toBe(75)
      expect(summary.byChannel.inStore).toBe(1)
      expect(summary.byChannel.delivery).toBe(1)
    })

    it('should exclude voided sales', async () => {
      const today = new Date().toISOString().slice(0, 10)

      await prisma.salesTransaction.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          invoice_number: 'INV-001',
          channel: 'IN_STORE',
          subtotal: 20,
          discount_total: 0,
          tax_total: 0,
          grand_total: 20,
          status: 'VOID',
          created_by: 'test-user',
          payments: {
            create: { tenant_id: TENANT_ID, payment_method: 'CASH', amount: 20, status: 'CONFIRMED', collected_by: 'test-user' },
          },
        },
      })

      const summary = await saleRepository.getDailySummary(today, null, baseCtx)
      expect(summary.totalTransactions).toBe(0)
    })
  })
})
