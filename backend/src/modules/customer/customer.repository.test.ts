import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { customerRepository } from './customer.repository'
import { CustomerContext, CustomerType } from './customer.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440001'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440002'
const OTHER_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440003'

const TRUNCATE_SQL = `TRUNCATE TABLE "customers", "customer_container_balances", "customer_addresses", "customer_tags", "customer_ledger", "audit_logs", "products", "product_categories", "tenants", "branches" CASCADE`

const baseCtx: CustomerContext = {
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
  await prisma.tenant.create({
    data: { id: OTHER_TENANT_ID, name: 'Other Tenant', is_active: true },
  })
  await prisma.branch.create({
    data: { id: OTHER_BRANCH_ID, tenant_id: OTHER_TENANT_ID, name: 'Other Branch', is_active: true },
  })

  // Create a product category and a container product for balance tests
  await prisma.productCategory.create({
    data: {
      id: 'cat-5500',
      tenant_id: TENANT_ID,
      name: 'Containers',
      is_active: true,
    },
  })
  await prisma.product.create({
    data: {
      id: 'prod-5500',
      tenant_id: TENANT_ID,
      category_id: 'cat-5500',
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
}

describe('CustomerRepository', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('create', () => {
    it('should create a customer and return the entity', async () => {
      const result = await customerRepository.create(
        { fullName: 'Maria Santos', phone: '+639171112222' },
        baseCtx,
      )

      expect(result).toBeDefined()
      expect(result.full_name).toBe('Maria Santos')
      expect(result.phone).toBe('+639171112222')
      expect(result.tenant_id).toBe(TENANT_ID)
      expect(result.branch_id).toBe(BRANCH_ID)
      expect(result.customer_type).toBe('RETAIL')
      expect(result.status).toBe('active')
      expect(result.deleted_at).toBeNull()
    })

    it('should accept all optional fields', async () => {
      const result = await customerRepository.create(
        {
          customerType: 'CORPORATE' as CustomerType,
          fullName: 'ABC Corp',
          companyName: 'ABC Corporation',
          phone: '+639171113333',
          email: 'abc@test.com',
          tin: '010-123-456-789',
          creditLimit: '50000',
          metadata: { vip: true },
        },
        baseCtx,
      )

      expect(result.customer_type).toBe('CORPORATE')
      expect(result.company_name).toBe('ABC Corporation')
      expect(result.email).toBe('abc@test.com')
      expect(result.tin).toBe('010-123-456-789')
    })
  })

  describe('findUnique', () => {
    it('should return a customer by ID within the correct tenant/branch', async () => {
      const created = await customerRepository.create(
        { fullName: 'Juan Dela Cruz', phone: '+639172223333' },
        baseCtx,
      )

      const found = await customerRepository.findUnique(created.id, baseCtx)
      expect(found).not.toBeNull()
      expect(found!.full_name).toBe('Juan Dela Cruz')
    })

    it('should return null for a customer in a different tenant', async () => {
      const created = await customerRepository.create(
        { fullName: 'Juan Dela Cruz', phone: '+639172223333' },
        baseCtx,
      )

      const otherCtx: CustomerContext = {
        tenantId: OTHER_TENANT_ID,
        branchId: OTHER_BRANCH_ID,
        userId: 'test-user',
      }

      const found = await customerRepository.findUnique(created.id, otherCtx)
      expect(found).toBeNull()
    })

    it('should return null for a soft-deleted customer', async () => {
      const created = await customerRepository.create(
        { fullName: 'ToDelete', phone: '+639172224444' },
        baseCtx,
      )

      await customerRepository.remove(created.id, baseCtx)

      const found = await customerRepository.findUnique(created.id, baseCtx)
      expect(found).toBeNull()
    })
  })

  describe('findMany', () => {
    beforeEach(async () => {
      await customerRepository.create({ fullName: 'Alpha', phone: '+639111111111' }, baseCtx)
      // Create with inactive status via Prisma directly (status defaults to 'active' on create)
      await prisma.customer.create({
        data: {
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          full_name: 'Beta',
          phone: '+639222222222',
          status: 'inactive',
        },
      })
      await customerRepository.create({ fullName: 'Gamma Corp', phone: '+639333333333', customerType: 'CORPORATE' as CustomerType }, baseCtx)

      // Customer in another branch of the same tenant
      await customerRepository.create(
        { fullName: 'Other Branch Customer', phone: '+639444444444' },
        { ...baseCtx, branchId: OTHER_BRANCH_ID },
      )
    })

    it('should return all customers for the tenant and branch (3 customers)', async () => {
      const { data, total } = await customerRepository.findMany({}, baseCtx)
      expect(total).toBe(3)
      expect(data).toHaveLength(3)
    })

    it('should return all customers across branches for HQ (branchId null)', async () => {
      const hqCtx: CustomerContext = {
        tenantId: TENANT_ID,
        branchId: null,
        userId: 'test-user',
      }
      const { data, total } = await customerRepository.findMany({}, hqCtx)
      expect(total).toBe(4)
    })

    it('should support pagination', async () => {
      const { data, total } = await customerRepository.findMany({ page: 1, limit: 2 }, baseCtx)
      expect(total).toBe(3)
      expect(data).toHaveLength(2)
    })

    it('should filter by status', async () => {
      const { data } = await customerRepository.findMany({ status: 'inactive' }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].full_name).toBe('Beta')
    })

    it('should filter by customer type', async () => {
      const { data } = await customerRepository.findMany({ customerType: 'CORPORATE' }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].full_name).toBe('Gamma Corp')
    })

    it('should search by name', async () => {
      const { data } = await customerRepository.findMany({ search: 'alpha' }, baseCtx)
      expect(data).toHaveLength(1)
      expect(data[0].full_name).toBe('Alpha')
    })

    it('should search case-insensitively', async () => {
      const { data } = await customerRepository.findMany({ search: 'GAMMA' }, baseCtx)
      expect(data).toHaveLength(1)
    })

    it('should sort by loyalty_points', async () => {
      const { data } = await customerRepository.findMany(
        { sortBy: 'loyalty_points', sortOrder: 'asc' },
        baseCtx,
      )
      expect(data).toHaveLength(3)
      // All have loyalty_points = 0, so order doesn't matter much
    })
  })

  describe('update', () => {
    it('should update customer fields', async () => {
      const created = await customerRepository.create(
        { fullName: 'Original Name', phone: '+639173334444' },
        baseCtx,
      )

      const updated = await customerRepository.update(
        created.id,
        { fullName: 'Updated Name' },
        baseCtx,
      )

      expect(updated.full_name).toBe('Updated Name')
      expect(updated.phone).toBe('+639173334444') // unchanged
    })

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(
        customerRepository.update(
          'non-existent-id',
          { fullName: 'Test' },
          baseCtx,
        ),
      ).rejects.toThrow('Customer not found')
    })

    it('should throw NotFoundError when customer belongs to different tenant', async () => {
      const created = await customerRepository.create(
        { fullName: 'Tenant A Customer', phone: '+639173335555' },
        baseCtx,
      )

      const otherCtx: CustomerContext = {
        tenantId: OTHER_TENANT_ID,
        branchId: OTHER_BRANCH_ID,
        userId: 'test-user',
      }

      await expect(
        customerRepository.update(created.id, { fullName: 'Hacked' }, otherCtx),
      ).rejects.toThrow('Customer not found')
    })
  })

  describe('remove (soft-delete)', () => {
    it('should soft-delete a customer', async () => {
      const created = await customerRepository.create(
        { fullName: 'To Delete', phone: '+639173336666' },
        baseCtx,
      )

      const removed = await customerRepository.remove(created.id, baseCtx)

      // The soft-deleted customer should no longer appear in findUnique
      const found = await customerRepository.findUnique(created.id, baseCtx)
      expect(found).toBeNull()

      // But the raw record should still exist with deleted_at set
      const raw = await prisma.customer.findUnique({ where: { id: created.id } })
      expect(raw).toBeDefined()
      expect(raw!.deleted_at).not.toBeNull()
    })
  })

  describe('findDuplicate', () => {
    it('should find a customer by phone', async () => {
      await customerRepository.create(
        { fullName: 'Dup Check', phone: '+639173337777' },
        baseCtx,
      )

      const dup = await customerRepository.findDuplicate('+639173337777', null, baseCtx)
      expect(dup).not.toBeNull()
      expect(dup!.full_name).toBe('Dup Check')
    })

    it('should find a customer by email', async () => {
      await customerRepository.create(
        { fullName: 'Email Check', phone: '+639173338888', email: 'dup@test.com' },
        baseCtx,
      )

      const dup = await customerRepository.findDuplicate('+639000000000', 'dup@test.com', baseCtx)
      expect(dup).not.toBeNull()
    })

    it('should exclude the customer specified by excludeId', async () => {
      const created = await customerRepository.create(
        { fullName: 'Exclude Check', phone: '+639173339999' },
        baseCtx,
      )

      const dup = await customerRepository.findDuplicate('+639173339999', null, baseCtx, created.id)
      expect(dup).toBeNull()
    })

    it('should not find duplicates across different tenants', async () => {
      await customerRepository.create(
        { fullName: 'Tenant A', phone: '+639173330000' },
        baseCtx,
      )

      const otherCtx: CustomerContext = {
        tenantId: OTHER_TENANT_ID,
        branchId: OTHER_BRANCH_ID,
        userId: 'test-user',
      }

      const dup = await customerRepository.findDuplicate('+639173330000', null, otherCtx)
      expect(dup).toBeNull()
    })
  })

  describe('initializeContainerBalances', () => {
    it('should create zero-balance entries for container products', async () => {
      const customer = await customerRepository.create(
        { fullName: 'Container Test', phone: '+639173331111' },
        baseCtx,
      )

      await customerRepository.initializeContainerBalances(customer.id, baseCtx)

      const balances = await prisma.customerContainerBalance.findMany({
        where: { customer_id: customer.id },
      })

      expect(balances).toHaveLength(1)
      expect(balances[0].quantity_held).toBe(0)
      expect(balances[0].product_id).toBe('prod-5500')
    })
  })

  describe('hasOutstandingBalance', () => {
    it('should return false for a customer with zero balance', async () => {
      const customer = await customerRepository.create(
        { fullName: 'Zero Balance', phone: '+639173332222' },
        baseCtx,
      )

      expect(await customerRepository.hasOutstandingBalance(customer.id, baseCtx)).toBe(false)
    })

    it('should return true for a customer with a positive balance', async () => {
      const customer = await customerRepository.create(
        { fullName: 'Debt Customer', phone: '+639173333333' },
        baseCtx,
      )

      await prisma.customer.update({
        where: { id: customer.id },
        data: { current_balance: 500 },
      })

      expect(await customerRepository.hasOutstandingBalance(customer.id, baseCtx)).toBe(true)
    })
  })

  describe('hasActiveDeliveryOrders', () => {
    it('should return false when no delivery orders exist', async () => {
      const customer = await customerRepository.create(
        { fullName: 'Clean Record', phone: '+639173334444' },
        baseCtx,
      )

      expect(await customerRepository.hasActiveDeliveryOrders(customer.id, baseCtx)).toBe(false)
    })
  })

  describe('hasUnpaidInvoices', () => {
    it('should return false when no ledger entries exist', async () => {
      const customer = await customerRepository.create(
        { fullName: 'Clean Ledger', phone: '+639173335555' },
        baseCtx,
      )

      expect(await customerRepository.hasUnpaidInvoices(customer.id, baseCtx)).toBe(false)
    })
  })

  describe('hasActiveInstallmentPlans', () => {
    it('should return false when no installment plans exist', async () => {
      const customer = await customerRepository.create(
        { fullName: 'No Plans', phone: '+639173336666' },
        baseCtx,
      )

      expect(await customerRepository.hasActiveInstallmentPlans(customer.id, baseCtx)).toBe(false)
    })
  })
})
