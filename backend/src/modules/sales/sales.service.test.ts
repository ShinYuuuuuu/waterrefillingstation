import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { saleService } from './sales.service'
import { SaleContext } from './sales.types'
import { NotFoundError, AppError } from '../../middleware/errorHandler'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440600'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440601'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440602'
const OTHER_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440603'

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
    data: { id: 'svc-cat-1', tenant_id: TENANT_ID, name: 'Water Products', is_active: true },
  })
  await prisma.product.create({
    data: {
      id: 'svc-prod-1',
      tenant_id: TENANT_ID,
      category_id: 'svc-cat-1',
      sku: 'SVC-REFILL',
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
      id: 'svc-prod-2',
      tenant_id: TENANT_ID,
      category_id: 'svc-cat-1',
      sku: 'SVC-GALLON',
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
      id: 'svc-prod-3',
      tenant_id: TENANT_ID,
      category_id: 'svc-cat-1',
      sku: 'SVC-EMPTY',
      name: 'Empty Gallon',
      type: 'CONTAINER',
      unit_of_measure: 'pc',
      base_price: 100,
      cost_price: 50,
      is_active: true,
    },
  })

  await prisma.branchInventory.create({
    data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'svc-prod-1', quantity_on_hand: 100, reserved_quantity: 0 },
  })
  await prisma.branchInventory.create({
    data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'svc-prod-2', quantity_on_hand: 50, reserved_quantity: 0 },
  })
  await prisma.branchInventory.create({
    data: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'svc-prod-3', quantity_on_hand: 30, reserved_quantity: 0 },
  })
}

describe('SaleService', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('createSale', () => {
    it('should throw if no items are provided', async () => {
      await expect(
        saleService.createSale(
          { channel: 'IN_STORE', items: [], payments: [{ amount: 20, method: 'CASH' }] },
          baseCtx,
        ),
      ).rejects.toThrow('At least one item is required')
    })

    it('should throw if no payments are provided', async () => {
      await expect(
        saleService.createSale(
          { channel: 'IN_STORE', items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }], payments: [] },
          baseCtx,
        ),
      ).rejects.toThrow('At least one payment is required')
    })

    it('should allow non-cash payment methods', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'GCASH' }],
        },
        baseCtx,
      )

      expect(sale.items).toHaveLength(1)
      expect(sale.payments).toHaveLength(1)
      expect(sale.payments[0].method).toBe('GCASH')
    })

    it('should throw if payment amount is less than grand total', async () => {
      await expect(
        saleService.createSale(
          {
            channel: 'IN_STORE',
            items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 2, unitPrice: 20 }],
            payments: [{ amount: 10, method: 'CASH' }],
          },
          baseCtx,
        ),
      ).rejects.toThrow('Insufficient payment amount')
    })

    it('should apply walk-in refill price (20) for SERVICE items', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Water Refill', quantity: 2, unitPrice: 0 }],
          payments: [{ amount: 40, method: 'CASH' }],
        },
        baseCtx,
      )

      expect(sale.items).toHaveLength(1)
      expect(sale.items[0].unitPrice).toBe(20)
      expect(sale.grandTotal).toBe(40)
    })

    it('should apply delivery refill price (25) for SERVICE items', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'DELIVERY',
          items: [{ productId: 'svc-prod-1', productName: 'Water Refill', quantity: 2, unitPrice: 0 }],
          payments: [{ amount: 50, method: 'CASH' }],
        },
        baseCtx,
      )

      expect(sale.items).toHaveLength(1)
      expect(sale.items[0].unitPrice).toBe(25)
      expect(sale.grandTotal).toBe(50)
    })

    it('should allow mixed transactions (refill + gallon)', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [
            { productId: 'svc-prod-1', productName: 'Water Refill', quantity: 1, unitPrice: 20 },
            { productId: 'svc-prod-2', productName: '5-Gallon Purified Water', quantity: 1, unitPrice: 55 },
          ],
          payments: [{ amount: 75, method: 'CASH' }],
        },
        baseCtx,
      )

      expect(sale.items).toHaveLength(2)
      expect(sale.grandTotal).toBe(75)
    })

    it('should deduct inventory when creating a sale', async () => {
      await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-2', productName: '5-Gallon Purified Water', quantity: 3, unitPrice: 55 }],
          payments: [{ amount: 165, method: 'CASH' }],
        },
        baseCtx,
      )

      const inventory = await prisma.branchInventory.findFirst({
        where: { branch_id: BRANCH_ID, product_id: 'svc-prod-2', tenant_id: TENANT_ID },
      })
      expect(Number((inventory as any).quantity_on_hand)).toBe(47)
    })

    it('should create inventory ledger entries', async () => {
      await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-2', productName: '5-Gallon Purified Water', quantity: 2, unitPrice: 55 }],
          payments: [{ amount: 110, method: 'CASH' }],
        },
        baseCtx,
      )

      const ledger = await prisma.inventoryLedger.findFirst({
        where: { product_id: 'svc-prod-2', tenant_id: TENANT_ID },
      })
      expect(ledger).toBeDefined()
      expect((ledger as any).movement_type).toBe('SALE')
      expect((ledger as any).quantity_delta).toBe(-2)
    })

    it('should prevent negative inventory', async () => {
      await expect(
        saleService.createSale(
          {
            channel: 'IN_STORE',
            items: [{ productId: 'svc-prod-2', productName: '5-Gallon Purified Water', quantity: 100, unitPrice: 55 }],
            payments: [{ amount: 5500, method: 'CASH' }],
          },
          baseCtx,
        ),
      ).rejects.toThrow('Insufficient inventory')
    })

    it('should validate customer if provided', async () => {
      await expect(
        saleService.createSale(
          {
            channel: 'IN_STORE',
            customerId: 'non-existent-customer',
            items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
            payments: [{ amount: 20, method: 'CASH' }],
          },
          baseCtx,
        ),
      ).rejects.toThrow('Customer')
    })

    it('should log an audit entry for CREATE', async () => {
      await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const auditLog = await prisma.auditLog.findFirst({
        where: { entity_type: 'SalesTransaction', action: 'CREATE', tenant_id: TENANT_ID },
      })
      expect(auditLog).toBeDefined()
    })
  })

  describe('getSale', () => {
    it('should return a mapped sale', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const result = await saleService.getSale(sale.id, baseCtx)
      expect(result.id).toBe(sale.id)
      expect(result.invoiceNumber).toBe(sale.invoiceNumber)
    })

    it('should throw NotFoundError for missing sale', async () => {
      await expect(saleService.getSale('non-existent', baseCtx)).rejects.toThrow('SalesTransaction')
    })
  })

  describe('getSales', () => {
    it('should return paginated sales', async () => {
      await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const result = await saleService.getSales({}, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })
  })

  describe('updateSale', () => {
    it('should update a sale', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const updated = await saleService.updateSale(sale.id, { channel: 'DELIVERY', notes: 'Updated' }, baseCtx)
      expect(updated.channel).toBe('DELIVERY')
      expect(updated.notes).toBe('Updated')
    })

    it('should throw for voided sale', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      await saleService.voidSale(sale.id, { reason: 'test' }, baseCtx)

      await expect(saleService.updateSale(sale.id, { channel: 'DELIVERY' }, baseCtx)).rejects.toThrow('Cannot update a voided sale')
    })
  })

  describe('deleteSale', () => {
    it('should soft-delete a sale', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      await expect(saleService.deleteSale(sale.id, baseCtx)).resolves.toBeUndefined()

      const result = await prisma.salesTransaction.findFirst({
        where: { id: sale.id },
      })
      expect((result as any).deleted_at).not.toBeNull()
    })
  })

  describe('recordPayment', () => {
    it('should record a cash payment', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const payment = await saleService.recordPayment(sale.id, { amount: 10, method: 'CASH' }, baseCtx)
      expect(Number((payment as any).amount)).toBe(10)
      expect((payment as any).payment_method).toBe('CASH')
    })

    it('should allow non-cash payment methods', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      const payment = await saleService.recordPayment(sale.id, { amount: 10, method: 'GCASH' }, baseCtx)
      expect(Number((payment as any).amount)).toBe(10)
      expect((payment as any).payment_method).toBe('GCASH')
    })

    it('should throw for voided sale', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      await saleService.voidSale(sale.id, { reason: 'test' }, baseCtx)
      await expect(saleService.recordPayment(sale.id, { amount: 10, method: 'CASH' }, baseCtx)).rejects.toThrow('Cannot record payment on a voided sale')
    })
  })

  describe('voidSale', () => {
    it('should void a completed sale and restore inventory', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-2', productName: '5-Gallon Purified Water', quantity: 3, unitPrice: 55 }],
          payments: [{ amount: 165, method: 'CASH' }],
        },
        baseCtx,
      )

      const beforeInventory = await prisma.branchInventory.findFirst({
        where: { branch_id: BRANCH_ID, product_id: 'svc-prod-2', tenant_id: TENANT_ID },
      })
      expect(Number((beforeInventory as any).quantity_on_hand)).toBe(47)

      const result = await saleService.voidSale(sale.id, { reason: 'Customer changed mind' }, baseCtx)
      expect(result.status).toBe('VOID')

      const afterInventory = await prisma.branchInventory.findFirst({
        where: { branch_id: BRANCH_ID, product_id: 'svc-prod-2', tenant_id: TENANT_ID },
      })
      expect(Number((afterInventory as any).quantity_on_hand)).toBe(50)
    })

    it('should throw if already voided', async () => {
      const sale = await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )

      await saleService.voidSale(sale.id, { reason: 'test' }, baseCtx)
      await expect(saleService.voidSale(sale.id, { reason: 'test again' }, baseCtx)).rejects.toThrow('Sale is already voided')
    })
  })

  describe('getDailySummary', () => {
    it('should return daily summary', async () => {
      const today = new Date().toISOString().slice(0, 10)

      await saleService.createSale(
        {
          channel: 'IN_STORE',
          items: [{ productId: 'svc-prod-1', productName: 'Refill', quantity: 1, unitPrice: 20 }],
          payments: [{ amount: 20, method: 'CASH' }],
        },
        baseCtx,
      )
      await saleService.createSale(
        {
          channel: 'DELIVERY',
          items: [{ productId: 'svc-prod-2', productName: 'Gallon', quantity: 1, unitPrice: 55 }],
          payments: [{ amount: 55, method: 'CASH' }],
        },
        baseCtx,
      )

      const summary = await saleService.getDailySummary(today, null, baseCtx)
      expect(summary.totalTransactions).toBe(2)
      expect(summary.totalGrandTotal).toBe(75)
      expect(summary.byChannel.inStore).toBe(1)
      expect(summary.byChannel.delivery).toBe(1)
    })
  })
})
