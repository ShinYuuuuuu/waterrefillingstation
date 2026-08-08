import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { customerService } from './customer.service'
import { NotFoundError, AppError } from '../../middleware/errorHandler'
import { CustomerContext, CustomerType } from './customer.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440100'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655440101'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655440200'
const OTHER_BRANCH_ID = '550e8400-e29b-41d4-a716-446655440201'

const TRUNCATE_SQL = `TRUNCATE TABLE "customers", "customer_container_balances", "customer_addresses", "customer_tags", "customer_ledger", "audit_logs", "products", "product_categories", "tenants", "branches", "installment_plans", "delivery_orders", "customer_statements", "users" CASCADE`

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

  await prisma.user.create({
    data: { id: 'test-user', tenant_id: TENANT_ID, email: 'test@test.com', full_name: 'Test User', password_hash: 'hash' },
  })

  await prisma.productCategory.create({
    data: {
      id: 'svc-cat-1',
      tenant_id: TENANT_ID,
      name: 'Containers',
      is_active: true,
    },
  })
  await prisma.product.create({
    data: {
      id: 'svc-prod-1',
      tenant_id: TENANT_ID,
      category_id: 'svc-cat-1',
      sku: 'SVC-5G',
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

describe('CustomerService', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  describe('createCustomer', () => {
    it('should create a customer and return a mapped DTO', async () => {
      const dto = await customerService.createCustomer(
        { fullName: 'Maria Santos', phone: '+639171112222' },
        baseCtx,
      )

      expect(dto.id).toBeDefined()
      expect(dto.fullName).toBe('Maria Santos')
      expect(dto.phone).toBe('+639171112222')
      expect(dto.tenantId).toBe(TENANT_ID)
      expect(dto.branchId).toBe(BRANCH_ID)
      expect(dto.customerType).toBe('RETAIL')
      expect(dto.creditLimit).toBe(0)
      expect(dto.createdAt).toBeDefined()
      expect(dto.updatedAt).toBeDefined()
    })

    it('should initialise container balances for container products', async () => {
      const dto = await customerService.createCustomer(
        { fullName: 'Container Test', phone: '+639171113333' },
        baseCtx,
      )

      const balances = await prisma.customerContainerBalance.findMany({
        where: { customer_id: dto.id },
      })
      expect(balances).toHaveLength(1)
      expect(balances[0].quantity_held).toBe(0)
    })

    it('should create an audit log entry', async () => {
      await customerService.createCustomer(
        { fullName: 'Audit Test', phone: '+639171114444' },
        baseCtx,
      )

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'CREATE', entity_type: 'Customer' },
      })
      expect(logs).toHaveLength(1)
      expect(logs[0].after_data).toBeDefined()
    })

    it('should reject duplicate phone within tenant', async () => {
      await customerService.createCustomer(
        { fullName: 'First', phone: '+639171115555' },
        baseCtx,
      )

      await expect(
        customerService.createCustomer(
          { fullName: 'Second', phone: '+639171115555' },
          baseCtx,
        ),
      ).rejects.toThrow('A customer with this phone number, email, or name already exists')
    })

    it('should reject duplicate email within tenant', async () => {
      await customerService.createCustomer(
        { fullName: 'First', phone: '+639171116666', email: 'dup@test.com' },
        baseCtx,
      )

      await expect(
        customerService.createCustomer(
          { fullName: 'Second', phone: '+639171117777', email: 'dup@test.com' },
          baseCtx,
        ),
      ).rejects.toThrow('A customer with this phone number, email, or name already exists')
    })

    it('should reject when branch context is missing (HQ/Owner)', async () => {
      const hqCtx: CustomerContext = {
        tenantId: TENANT_ID,
        branchId: null,
        userId: 'test-user',
      }

      await expect(
        customerService.createCustomer(
          { fullName: 'No Branch', phone: '+639171118888' },
          hqCtx,
        ),
      ).rejects.toThrow('A branch context is required to create a customer')
    })

    it('should allow duplicate phone across different tenants', async () => {
      await customerService.createCustomer(
        { fullName: 'Tenant A Customer', phone: '+639171119999' },
        baseCtx,
      )

      const otherBranchCtx: CustomerContext = {
        tenantId: OTHER_TENANT_ID,
        branchId: OTHER_BRANCH_ID,
        userId: 'test-user',
      }

      const dto = await customerService.createCustomer(
        { fullName: 'Tenant B Customer', phone: '+639171119999' },
        otherBranchCtx,
      )

      expect(dto.fullName).toBe('Tenant B Customer')
      expect(dto.tenantId).toBe(OTHER_TENANT_ID)
    })
  })

  describe('getCustomer', () => {
    it('should return a mapped customer DTO', async () => {
      const created = await customerService.createCustomer(
        { fullName: 'Get Me', phone: '+639172111111' },
        baseCtx,
      )

      const dto = await customerService.getCustomer(created.id, baseCtx)

      expect(dto.id).toBe(created.id)
      expect(dto.fullName).toBe('Get Me')
    })

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(
        customerService.getCustomer('non-existent-id', baseCtx),
      ).rejects.toThrow('Customer not found')
    })

    it('should throw NotFoundError for customer in a different tenant', async () => {
      const created = await customerService.createCustomer(
        { fullName: 'Isolation Test', phone: '+639172222222' },
        baseCtx,
      )

      const otherCtx: CustomerContext = {
        tenantId: OTHER_TENANT_ID,
        branchId: OTHER_BRANCH_ID,
        userId: 'test-user',
      }

      await expect(
        customerService.getCustomer(created.id, otherCtx),
      ).rejects.toThrow('Customer not found')
    })
  })

  describe('getCustomers (list)', () => {
    beforeEach(async () => {
      await customerService.createCustomer({ fullName: 'Alpha', phone: '+639172333333' }, baseCtx)
      await customerService.createCustomer({ fullName: 'Beta', phone: '+639172444444', customerType: 'RESELLER' }, baseCtx)
      await customerService.createCustomer({ fullName: 'Gamma', phone: '+639172555555' }, baseCtx)
    })

    it('should return paginated results', async () => {
      const result = await customerService.getCustomers({ page: 1, limit: 2 }, baseCtx)

      expect(result.meta.total).toBe(3)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(2)
      expect(result.data).toHaveLength(2)
      expect(result.meta.totalPages).toBe(2)
    })

    it('should search by name', async () => {
      const result = await customerService.getCustomers({ search: 'alpha' }, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].fullName).toBe('Alpha')
    })

    it('should filter by customer type', async () => {
      const result = await customerService.getCustomers({ customerType: 'RESELLER' }, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].fullName).toBe('Beta')
    })

    it('should return all customers for HQ (branchId null)', async () => {
      const hqCtx: CustomerContext = {
        tenantId: TENANT_ID,
        branchId: null,
        userId: 'test-user',
      }

      const result = await customerService.getCustomers({}, hqCtx)
      expect(result.data).toHaveLength(3)
    })
  })

  describe('updateCustomer', () => {
    let customerId: string

    beforeEach(async () => {
      const created = await customerService.createCustomer(
        { fullName: 'Updatable', phone: '+639173111111' },
        baseCtx,
      )
      customerId = created.id
    })

    it('should update customer fields', async () => {
      const dto = await customerService.updateCustomer(
        customerId,
        { fullName: 'Updated Name' },
        baseCtx,
      )

      expect(dto.fullName).toBe('Updated Name')
      expect(dto.phone).toBe('+639173111111')
      expect(dto.updatedAt).not.toBe(dto.createdAt)
    })

    it('should create an audit log with before and after data', async () => {
      await customerService.updateCustomer(customerId, { fullName: 'Changed' }, baseCtx)

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'UPDATE', entity_type: 'Customer' },
      })
      expect(logs).toHaveLength(1)
      expect(logs[0].before_data).toBeDefined()
      expect(logs[0].after_data).toBeDefined()
    })

    it('should reject current_balance modification', async () => {
      await expect(
        customerService.updateCustomer(customerId, { currentBalance: 999 }, baseCtx),
      ).rejects.toThrow('Customer balance can only be adjusted through the payment ledger')
    })

    it('should reject duplicate phone during update', async () => {
      await customerService.createCustomer(
        { fullName: 'Other Customer', phone: '+639173222222' },
        baseCtx,
      )

      await expect(
        customerService.updateCustomer(customerId, { phone: '+639173222222' }, baseCtx),
      ).rejects.toThrow('A different customer with this phone number, email, or name already exists')
    })

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(
        customerService.updateCustomer('non-existent', { fullName: 'Test' }, baseCtx),
      ).rejects.toThrow('Customer not found')
    })

    it('should allow updating without conflicting phone (same phone)', async () => {
      const dto = await customerService.updateCustomer(
        customerId,
        { fullName: 'Same Phone Update' },
        baseCtx,
      )

      expect(dto.fullName).toBe('Same Phone Update')
      expect(dto.phone).toBe('+639173111111')
    })
  })

  describe('deleteCustomer', () => {
    let customerId: string

    beforeEach(async () => {
      const created = await customerService.createCustomer(
        { fullName: 'ToDelete', phone: '+639173333333' },
        baseCtx,
      )
      customerId = created.id
    })

    it('should soft-delete a customer with no blocking records', async () => {
      await customerService.deleteCustomer(customerId, baseCtx)

      // Customer should be soft-deleted in the DB
      const raw = await prisma.customer.findUnique({ where: { id: customerId } })
      expect(raw).toBeDefined()
      expect(raw!.deleted_at).not.toBeNull()

      // But should not be found via the service (soft-deleted records are excluded)
      await expect(
        customerService.getCustomer(customerId, baseCtx),
      ).rejects.toThrow('Customer not found')
    })

    it('should create an audit log entry on delete', async () => {
      await customerService.deleteCustomer(customerId, baseCtx)

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'DELETE', entity_type: 'Customer' },
      })
      expect(logs).toHaveLength(1)
      expect(logs[0].before_data).toBeDefined()
    })

    it('should reject deletion when customer has outstanding balance', async () => {
      await prisma.customer.update({
        where: { id: customerId },
        data: { current_balance: 500 },
      })

      await expect(
        customerService.deleteCustomer(customerId, baseCtx),
      ).rejects.toThrow('Cannot delete customer with outstanding balance')

      // Customer should still exist
      const raw = await prisma.customer.findUnique({ where: { id: customerId } })
      expect(raw!.deleted_at).toBeNull()
    })

    it('should reject deletion with active delivery orders', async () => {
      await prisma.deliveryOrder.create({
        data: {
          id: 'do-1',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          customer_id: customerId,
          address_id: null,
          status: 'PENDING',
        },
      })

      await expect(
        customerService.deleteCustomer(customerId, baseCtx),
      ).rejects.toThrow('Cannot delete customer with active delivery orders')
    })

    it('should reject deletion with unpaid invoices', async () => {
      await prisma.customerLedger.create({
        data: {
          id: 'cl-1',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          customer_id: customerId,
          entry_type: 'charge',
          amount: 100,
          running_balance: 100,
          is_paid: false,
        },
      })

      await expect(
        customerService.deleteCustomer(customerId, baseCtx),
      ).rejects.toThrow('Cannot delete customer with unpaid invoices')
    })

    it('should reject deletion with active installment plans', async () => {
      await prisma.installmentPlan.create({
        data: {
          id: 'ip-1',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          customer_id: customerId,
          total_amount: 1000,
          number_of_installments: 3,
          installment_amount: 333.33,
          start_date: new Date(),
          status: 'active',
        },
      })

      await expect(
        customerService.deleteCustomer(customerId, baseCtx),
      ).rejects.toThrow('Cannot delete customer with active installment plans')
    })

    it('should throw NotFoundError for non-existent customer', async () => {
      await expect(
        customerService.deleteCustomer('non-existent-id', baseCtx),
      ).rejects.toThrow('Customer not found')
    })

    it('should allow deletion when delivery order is in terminal status', async () => {
      await prisma.deliveryOrder.create({
        data: {
          id: 'do-terminal',
          tenant_id: TENANT_ID,
          branch_id: BRANCH_ID,
          customer_id: customerId,
          address_id: null,
          status: 'CANCELLED',
        },
      })

      await expect(
        customerService.deleteCustomer(customerId, baseCtx),
      ).resolves.toBeUndefined()
    })
  })
})
