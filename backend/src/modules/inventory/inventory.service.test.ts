import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { prisma } from '../../database'
import { inventoryService } from './inventory.service'
import { inventoryRepository } from './inventory.repository'
import { InventoryContext } from './inventory.types'

const TENANT_ID = '550e8400-e29b-41d4-a716-446655460000'
const BRANCH_ID = '550e8400-e29b-41d4-a716-446655460001'
const OTHER_BRANCH_ID = '550e8400-e29b-41d4-a716-446655460002'
const OTHER_TENANT_ID = '550e8400-e29b-41d4-a716-446655461000'

const TRUNCATE_SQL = `TRUNCATE TABLE "branch_inventory", "inventory_ledger", "production_batches", "stock_transfers", "stock_transfer_items", "stock_count_sessions", "stock_count_items", "audit_logs", "products", "product_categories", "tenants", "branches", "users" CASCADE`

const baseCtx: InventoryContext = {
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
      sku: 'SVC-5G-WATER',
      name: '5-Gallon Purified Water',
      type: 'FINISHED_GOOD',
      unit_of_measure: 'pc',
      base_price: 55,
      cost_price: 25,
      reorder_level: 10,
      is_active: true,
    },
  })
  await prisma.product.create({
    data: {
      id: 'svc-prod-2',
      tenant_id: TENANT_ID,
      category_id: 'svc-cat-1',
      sku: 'SVC-RAW-WATER',
      name: 'Raw Water',
      type: 'RAW_MATERIAL',
      unit_of_measure: 'liter',
      base_price: 5,
      cost_price: 3,
      reorder_level: 100,
      is_active: true,
    },
  })
}

describe('InventoryService', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
    await setupPrerequisites()
  })

  afterEach(async () => {
    await prisma.$executeRawUnsafe(TRUNCATE_SQL)
  })

  // =======================================================================
  // Branch Inventory CRUD
  // =======================================================================

  describe('listBranchInventory', () => {
    beforeEach(async () => {
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-2', quantityOnHand: 200 },
        baseCtx,
      )
    })

    it('should return paginated list', async () => {
      const result = await inventoryService.listBranchInventory({ page: 1, limit: 1 }, baseCtx)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(1)
      expect(result.meta.totalPages).toBe(2)
      expect(result.data).toHaveLength(1)
    })

    it('should include available quantity', async () => {
      const result = await inventoryService.listBranchInventory(
        { productId: 'svc-prod-1' },
        baseCtx,
      )
      expect(result.data[0].availableQuantity).toBe(100)
      expect(result.data[0].reorderLevel).toBe(10)
    })

    it('should filter for low stock', async () => {
      // svc-prod-1: 5 on hand, reorder_level=10 → low stock
      // svc-prod-2: 200 on hand, reorder_level=100 → not low stock
      await prisma.branchInventory.updateMany({
        where: { tenant_id: TENANT_ID, product_id: 'svc-prod-1' },
        data: { quantity_on_hand: 5 },
      })

      const result = await inventoryService.listBranchInventory({ lowStock: true }, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].productId).toBe('svc-prod-1')
    })
  })

  describe('createBranchInventory', () => {
    it('should create branch inventory and return response DTO', async () => {
      const result = await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100, reservedQuantity: 5 },
        baseCtx,
      )

      expect(result.id).toBeDefined()
      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.branchId).toBe(BRANCH_ID)
      expect(result.productId).toBe('svc-prod-1')
      expect(result.quantityOnHand).toBe(100)
      expect(result.reservedQuantity).toBe(5)
      expect(result.availableQuantity).toBe(100)
      expect(result.createdAt).toBeDefined()
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        inventoryService.createBranchInventory(
          { productId: 'non-existent-product', quantityOnHand: 100 },
          baseCtx,
        ),
      ).rejects.toThrow('Product not found')
    })

    it('should create an audit log entry', async () => {
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'CREATE', entity_type: 'BranchInventory' },
      })
      expect(logs).toHaveLength(1)
    })
  })

  describe('updateBranchInventory', () => {
    let inventoryId: string

    beforeEach(async () => {
      const result = await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      inventoryId = result.id
    })

    it('should update branch inventory', async () => {
      const updated = await inventoryService.updateBranchInventory(
        inventoryId,
        { quantityOnHand: 200, reservedQuantity: 10 },
        baseCtx,
      )

      expect(updated.quantityOnHand).toBe(200)
      expect(updated.reservedQuantity).toBe(10)
      expect(updated.availableQuantity).toBe(200)
    })

    it('should create an audit log with before and after', async () => {
      await inventoryService.updateBranchInventory(inventoryId, { quantityOnHand: 150 }, baseCtx)

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'UPDATE', entity_type: 'BranchInventory' },
      })
      expect(logs).toHaveLength(1)
      expect(logs[0].before_data).toBeDefined()
      expect(logs[0].after_data).toBeDefined()
    })

    it('should throw NotFoundError for non-existent inventory', async () => {
      await expect(
        inventoryService.updateBranchInventory('non-existent', { quantityOnHand: 100 }, baseCtx),
      ).rejects.toThrow('BranchInventory not found')
    })
  })

  describe('deleteBranchInventory', () => {
    let inventoryId: string

    beforeEach(async () => {
      const result = await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      inventoryId = result.id
    })

    it('should soft-delete and log audit', async () => {
      await inventoryService.deleteBranchInventory(inventoryId, baseCtx)

      const raw = await prisma.branchInventory.findUnique({ where: { id: inventoryId } })
      expect(raw!.deleted_at).not.toBeNull()

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'DELETE', entity_type: 'BranchInventory' },
      })
      expect(logs).toHaveLength(1)
    })

    it('should throw NotFoundError for non-existent inventory', async () => {
      await expect(
        inventoryService.deleteBranchInventory('non-existent', baseCtx),
      ).rejects.toThrow('BranchInventory not found')
    })
  })

  // =======================================================================
  // Low Stock Alerts
  // =======================================================================

  describe('getLowStockAlerts', () => {
    it('should return products below reorder level', async () => {
      // svc-prod-1: reorder_level=10
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 5, reservedQuantity: 0 },
        baseCtx,
      )
      // svc-prod-2: reorder_level=100, well above
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-2', quantityOnHand: 200, reservedQuantity: 0 },
        baseCtx,
      )

      const alerts = await inventoryService.getLowStockAlerts(baseCtx)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].productId).toBe('svc-prod-1')
      expect(alerts[0].availableQuantity).toBe(5)
      expect(alerts[0].reorderLevel).toBe(10)
    })

    it('should not treat circulating stock as low shop stock', async () => {
      // 20 on hand, 15 reserved = 5 available, reorder_level=10 → low
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 20, reservedQuantity: 15 },
        baseCtx,
      )

      const alerts = await inventoryService.getLowStockAlerts(baseCtx)
      expect(alerts).toHaveLength(0)
    })

    it('should return empty when all above reorder level', async () => {
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      const alerts = await inventoryService.getLowStockAlerts(baseCtx)
      expect(alerts).toHaveLength(0)
    })
  })

  // =======================================================================
  // Inventory Ledger
  // =======================================================================

  describe('listLedgerEntries', () => {
    beforeEach(async () => {
      await inventoryRepository.createLedgerEntry({
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        productId: 'svc-prod-1',
        movementType: 'PURCHASE',
        quantityDelta: 100,
        notes: 'Initial stock',
        userId: 'test-user',
      })
      await inventoryRepository.createLedgerEntry({
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        productId: 'svc-prod-1',
        movementType: 'SALE',
        quantityDelta: -5,
        userId: 'test-user',
      })
    })

    it('should return paginated list', async () => {
      const result = await inventoryService.listLedgerEntries({}, baseCtx)
      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(2)
    })

    it('should filter by movement type', async () => {
      const result = await inventoryService.listLedgerEntries(
        { movementType: 'PURCHASE' },
        baseCtx,
      )
      expect(result.data).toHaveLength(1)
      expect(result.data[0].movementType).toBe('PURCHASE')
    })
  })

  describe('getLedgerEntry', () => {
    it('should return a ledger entry by ID', async () => {
      const entry = await inventoryRepository.createLedgerEntry({
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        productId: 'svc-prod-1',
        movementType: 'PURCHASE',
        quantityDelta: 100,
        userId: 'test-user',
      })

      const result = await inventoryService.getLedgerEntry(entry.id, baseCtx)
      expect(result.id).toBe(entry.id)
      expect(result.movementType).toBe('PURCHASE')
      expect(result.quantityDelta).toBe(100)
    })

    it('should throw NotFoundError for non-existent entry', async () => {
      await expect(
        inventoryService.getLedgerEntry('non-existent', baseCtx),
      ).rejects.toThrow('InventoryLedger not found')
    })
  })

  // =======================================================================
  // Production Batch
  // =======================================================================

  describe('listProductionBatches', () => {
    beforeEach(async () => {
      await inventoryRepository.createProductionBatch(
        { batchNumber: 'BATCH-1', outputProductId: 'svc-prod-1', outputQuantity: 240 },
        baseCtx,
      )
      const batch = await inventoryRepository.createProductionBatch(
        { batchNumber: 'BATCH-2', outputProductId: 'svc-prod-1', outputQuantity: 100 },
        baseCtx,
      )
      await inventoryRepository.completeProductionBatch(batch.id, baseCtx)
    })

    it('should return all batches', async () => {
      const result = await inventoryService.listProductionBatches({}, baseCtx)
      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(2)
    })

    it('should filter by status', async () => {
      const result = await inventoryService.listProductionBatches(
        { status: 'COMPLETED' },
        baseCtx,
      )
      expect(result.data).toHaveLength(1)
      expect(result.data[0].batchNumber).toBe('BATCH-2')
    })
  })

  describe('getProductionBatch', () => {
    it('should return batch details with ledger entries', async () => {
      const batch = await inventoryRepository.createProductionBatch(
        { batchNumber: 'BATCH-DETAIL', outputProductId: 'svc-prod-1', outputQuantity: 240 },
        baseCtx,
      )

      const result = await inventoryService.getProductionBatch(batch.id, baseCtx)
      expect(result.batchNumber).toBe('BATCH-DETAIL')
      expect(result.outputQuantity).toBe(240)
      expect(result.ledgerEntries).toHaveLength(1)
      expect(result.ledgerEntries[0].movementType).toBe('PRODUCTION')
      expect(result.ledgerEntries[0].quantityDelta).toBe(240)
    })

    it('should throw NotFoundError for non-existent batch', async () => {
      await expect(
        inventoryService.getProductionBatch('non-existent', baseCtx),
      ).rejects.toThrow('ProductionBatch not found')
    })
  })

  describe('createProductionBatch', () => {
    it('should create a batch and return DTO', async () => {
      const result = await inventoryService.createProductionBatch(
        {
          batchNumber: 'PB-NEW-1',
          outputProductId: 'svc-prod-1',
          outputQuantity: 240,
          qualityCheckPassed: true,
        },
        baseCtx,
      )

      expect(result.batchNumber).toBe('PB-NEW-1')
      expect(result.outputQuantity).toBe(240)
      expect(result.qualityCheckPassed).toBe(true)
      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.branchId).toBe(BRANCH_ID)
    })

    it('should reject when branch context is missing', async () => {
      const hqCtx: InventoryContext = { tenantId: TENANT_ID, branchId: null, userId: 'test-user' }
      await expect(
        inventoryService.createProductionBatch(
          { batchNumber: 'PB-NO-BRANCH', outputProductId: 'svc-prod-1', outputQuantity: 240 },
          hqCtx,
        ),
      ).rejects.toThrow('A branch context is required')
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        inventoryService.createProductionBatch(
          { batchNumber: 'PB-NO-PROD', outputProductId: 'non-existent', outputQuantity: 240 },
          baseCtx,
        ),
      ).rejects.toThrow('Product not found')
    })

    it('should create an audit log entry', async () => {
      await inventoryService.createProductionBatch(
        { batchNumber: 'PB-AUDIT', outputProductId: 'svc-prod-1', outputQuantity: 100 },
        baseCtx,
      )

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'CREATE', entity_type: 'ProductionBatch' },
      })
      expect(logs).toHaveLength(1)
    })
  })

  describe('completeProductionBatch', () => {
    it('should mark batch as completed', async () => {
      const batch = await inventoryRepository.createProductionBatch(
        { batchNumber: 'COMPLETE-1', outputProductId: 'svc-prod-1', outputQuantity: 240 },
        baseCtx,
      )

      const result = await inventoryService.completeProductionBatch(batch.id, baseCtx)
      expect(result.completedAt).not.toBeNull()
    })
  })

  // =======================================================================
  // Stock Transfer
  // =======================================================================

  describe('listStockTransfers', () => {
    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
    })

    it('should list transfers and include items', async () => {
      await inventoryService.createStockTransfer(
        { destinationBranchId: OTHER_BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 50 }] },
        baseCtx,
      )

      const result = await inventoryService.listStockTransfers({}, baseCtx)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].items).toHaveLength(1)
      expect(result.data[0].items[0].quantitySent).toBe(50)
    })
  })

  describe('getStockTransfer', () => {
    it('should return transfer with items', async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      const transfer = await inventoryRepository.createStockTransfer(
        { destinationBranchId: OTHER_BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 30 }] },
        baseCtx,
      )

      const result = await inventoryService.getStockTransfer(transfer.id, baseCtx)
      expect(result.status).toBe('PENDING')
      expect(result.originBranchId).toBe(BRANCH_ID)
      expect(result.destinationBranchId).toBe(OTHER_BRANCH_ID)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].quantitySent).toBe(30)
    })

    it('should throw NotFoundError for non-existent transfer', async () => {
      await expect(
        inventoryService.getStockTransfer('non-existent', baseCtx),
      ).rejects.toThrow('StockTransfer not found')
    })

    it('should enforce tenant isolation', async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      const transfer = await inventoryRepository.createStockTransfer(
        { destinationBranchId: OTHER_BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 30 }] },
        baseCtx,
      )

      const otherCtx: InventoryContext = {
        tenantId: OTHER_TENANT_ID,
        branchId: null,
        userId: 'test-user',
      }

      await expect(
        inventoryService.getStockTransfer(transfer.id, otherCtx),
      ).rejects.toThrow('StockTransfer not found')
    })
  })

  describe('createStockTransfer', () => {
    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
    })

    it('should create a transfer in PENDING status', async () => {
      const result = await inventoryService.createStockTransfer(
        {
          destinationBranchId: OTHER_BRANCH_ID,
          items: [{ productId: 'svc-prod-1', quantity: 50 }],
        },
        baseCtx,
      )

      expect(result.status).toBe('PENDING')
      expect(result.destinationBranchId).toBe(OTHER_BRANCH_ID)
      expect(result.items).toHaveLength(1)
    })

    it('should reject when branch context is missing', async () => {
      const hqCtx: InventoryContext = { tenantId: TENANT_ID, branchId: null, userId: 'test-user' }
      await expect(
        inventoryService.createStockTransfer(
          { destinationBranchId: OTHER_BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 10 }] },
          hqCtx,
        ),
      ).rejects.toThrow('A branch context is required')
    })

    it('should reject when origin equals destination', async () => {
      await expect(
        inventoryService.createStockTransfer(
          { destinationBranchId: BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 10 }] },
          baseCtx,
        ),
      ).rejects.toThrow('must be different')
    })

    it('should create an audit log entry', async () => {
      await inventoryService.createStockTransfer(
        { destinationBranchId: OTHER_BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 50 }] },
        baseCtx,
      )

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'CREATE', entity_type: 'StockTransfer' },
      })
      expect(logs).toHaveLength(1)
    })
  })

  describe('updateStockTransferStatus', () => {
    let transferId: string

    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      const transfer = await inventoryRepository.createStockTransfer(
        { destinationBranchId: OTHER_BRANCH_ID, items: [{ productId: 'svc-prod-1', quantity: 50 }] },
        baseCtx,
      )
      transferId = transfer.id
    })

    it('should transition PENDING → APPROVED', async () => {
      const result = await inventoryService.updateStockTransferStatus(
        transferId,
        'APPROVED',
        null,
        baseCtx,
      )
      expect(result.status).toBe('APPROVED')
    })

    it('should transition APPROVED → IN_TRANSIT and deduct from origin', async () => {
      await inventoryService.updateStockTransferStatus(transferId, 'APPROVED', null, baseCtx)
      const result = await inventoryService.updateStockTransferStatus(
        transferId,
        'IN_TRANSIT',
        null,
        baseCtx,
      )
      expect(result.status).toBe('IN_TRANSIT')

      // Verify stock was deducted from origin
      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'svc-prod-1' },
      })
      expect(inv!.quantity_on_hand).toBe(50)
    })

    it('should transition IN_TRANSIT → RECEIVED and add to destination', async () => {
      await inventoryService.updateStockTransferStatus(transferId, 'APPROVED', null, baseCtx)
      await inventoryService.updateStockTransferStatus(transferId, 'IN_TRANSIT', null, baseCtx)
      const result = await inventoryService.updateStockTransferStatus(
        transferId,
        'RECEIVED',
        null,
        baseCtx,
      )
      expect(result.status).toBe('RECEIVED')

      // Verify stock was added to destination
      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: OTHER_BRANCH_ID, product_id: 'svc-prod-1' },
      })
      expect(inv!.quantity_on_hand).toBe(50)
    })

    it('should reject invalid transition PENDING → IN_TRANSIT', async () => {
      await expect(
        inventoryService.updateStockTransferStatus(transferId, 'IN_TRANSIT', null, baseCtx),
      ).rejects.toThrow('Invalid status transition')
    })

    it('should allow cancellation from PENDING', async () => {
      const result = await inventoryService.updateStockTransferStatus(
        transferId,
        'CANCELLED',
        null,
        baseCtx,
      )
      expect(result.status).toBe('CANCELLED')
    })
  })

  // =======================================================================
  // Stock Count
  // =======================================================================

  describe('createStockCountSession', () => {
    it('should create an OPEN session', async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      const result = await inventoryService.createStockCountSession(baseCtx, 'Cycle count 1')
      expect(result.status).toBe('OPEN')
      expect(result.notes).toBe('Cycle count 1')
      expect(result.branchId).toBe(BRANCH_ID)
    })

    it('should reject when branch context is missing', async () => {
      const hqCtx: InventoryContext = { tenantId: TENANT_ID, branchId: null, userId: 'test-user' }
      await expect(
        inventoryService.createStockCountSession(hqCtx),
      ).rejects.toThrow('A branch context is required')
    })

    it('should reject second open session for same branch', async () => {
      await inventoryRepository.createStockCountSession(baseCtx, 'First')

      await expect(
        inventoryService.createStockCountSession(baseCtx, 'Second'),
      ).rejects.toThrow('already open')
    })
  })

  describe('recordStockCountItems', () => {
    let sessionId: string

    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      const session = await inventoryService.createStockCountSession(baseCtx)
      sessionId = session.id
    })

    it('should record counts and calculate variance', async () => {
      const result = await inventoryService.recordStockCountItems(
        sessionId,
        { items: [{ productId: 'svc-prod-1', countedQuantity: 95 }] },
        baseCtx,
      )

      const item = result.items[0]
      expect(item.bookQuantity).toBe(100)
      expect(item.countedQuantity).toBe(95)
      expect(item.variance).toBe(-5)
    })
  })

  describe('calculateStockCountVariance', () => {
    let sessionId: string

    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      const session = await inventoryService.createStockCountSession(baseCtx)
      sessionId = session.id
      await inventoryService.recordStockCountItems(
        sessionId,
        { items: [{ productId: 'svc-prod-1', countedQuantity: 95 }] },
        baseCtx,
      )
    })

    it('should return session with calculated variance', async () => {
      const result = await inventoryService.calculateStockCountVariance(sessionId, baseCtx)
      expect(result.items[0].variance).toBe(-5)
    })
  })

  describe('submitStockCount', () => {
    let sessionId: string

    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      const session = await inventoryService.createStockCountSession(baseCtx)
      sessionId = session.id
      await inventoryService.recordStockCountItems(
        sessionId,
        { items: [{ productId: 'svc-prod-1', countedQuantity: 95 }] },
        baseCtx,
      )
    })

    it('should transition status to SUBMITTED', async () => {
      const result = await inventoryService.submitStockCount(sessionId, baseCtx)
      expect(result.status).toBe('SUBMITTED')
    })

    it('should reject if not in OPEN status', async () => {
      await inventoryService.submitStockCount(sessionId, baseCtx)

      await expect(
        inventoryService.submitStockCount(sessionId, baseCtx),
      ).rejects.toThrow('must be in OPEN status')
    })
  })

  describe('approveStockCount', () => {
    let sessionId: string

    beforeEach(async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      const session = await inventoryService.createStockCountSession(baseCtx)
      sessionId = session.id
      await inventoryService.recordStockCountItems(
        sessionId,
        { items: [{ productId: 'svc-prod-1', countedQuantity: 95 }] },
        baseCtx,
      )
      await inventoryService.submitStockCount(sessionId, baseCtx)
    })

    it('should approve and post inventory adjustment', async () => {
      const result = await inventoryService.approveStockCount(sessionId, baseCtx)
      expect(result.status).toBe('APPROVED')

      // Verify inventory updated to counted quantity
      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'svc-prod-1' },
      })
      expect(inv!.quantity_on_hand).toBe(95)

      // Verify ledger entry
      const ledger = await prisma.inventoryLedger.findFirst({
        where: {
          tenant_id: TENANT_ID,
          movement_type: 'ADJUSTMENT',
          reference_type: 'StockCount',
        },
      })
      expect(ledger).not.toBeNull()
      expect(ledger!.quantity_delta).toBe(-5)
    })

    it('should reject if not in SUBMITTED status', async () => {
      // Create a session in OPEN status (not submitted)
      const openSession = await inventoryService.createStockCountSession(baseCtx)
      await inventoryService.recordStockCountItems(
        openSession.id,
        { items: [{ productId: 'svc-prod-1', countedQuantity: 95 }] },
        baseCtx,
      )

      // Session is OPEN, not SUBMITTED — approval should fail
      await expect(
        inventoryService.approveStockCount(openSession.id, baseCtx),
      ).rejects.toThrow('must be in SUBMITTED status')
    })
  })

  describe('getStockCountSession', () => {
    it('should return session with items', async () => {
      await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )
      const session = await inventoryService.createStockCountSession(baseCtx)
      await inventoryService.recordStockCountItems(
        session.id,
        { items: [{ productId: 'svc-prod-1', countedQuantity: 95 }] },
        baseCtx,
      )

      const result = await inventoryService.getStockCountSession(session.id, baseCtx)
      expect(result.status).toBe('OPEN')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].variance).toBe(-5)
    })
  })

  // =======================================================================
  // Inventory Adjustment
  // =======================================================================

  describe('createAdjustment', () => {
    let inventoryId: string

    beforeEach(async () => {
      const inv = await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100, reservedQuantity: 0 },
        baseCtx,
      )
      inventoryId = inv.id
    })

    it('should reduce inventory for DAMAGE reason', async () => {
      const result = await inventoryService.createAdjustment(
        { productId: 'svc-prod-1', quantity: 10, reason: 'DAMAGE', notes: 'Broken' },
        baseCtx,
      )

      expect(result.quantity).toBe(-10)

      const inv = await prisma.branchInventory.findUnique({ where: { id: inventoryId } })
      expect(inv!.quantity_on_hand).toBe(90)

      // Verify ledger entry
      const ledger = await prisma.inventoryLedger.findFirst({
        where: { tenant_id: TENANT_ID, movement_type: 'ADJUSTMENT' },
      })
      expect(ledger).not.toBeNull()
      expect(ledger!.quantity_delta).toBe(-10)
    })

    it('should increase inventory for OPENING_BALANCE reason', async () => {
      const result = await inventoryService.createAdjustment(
        { productId: 'svc-prod-1', quantity: 50, reason: 'OPENING_BALANCE', notes: 'Initial' },
        baseCtx,
      )

      expect(result.quantity).toBe(50)

      const inv = await prisma.branchInventory.findUnique({ where: { id: inventoryId } })
      expect(inv!.quantity_on_hand).toBe(150)
    })

    it('should increase inventory for MANUAL reason (positive quantity)', async () => {
      const result = await inventoryService.createAdjustment(
        { productId: 'svc-prod-1', quantity: 25, reason: 'MANUAL' },
        baseCtx,
      )

      expect(result.quantity).toBe(25)

      const inv = await prisma.branchInventory.findUnique({ where: { id: inventoryId } })
      expect(inv!.quantity_on_hand).toBe(125)
    })

    it('should prevent negative inventory', async () => {
      await expect(
        inventoryService.createAdjustment(
          { productId: 'svc-prod-1', quantity: 200, reason: 'DAMAGE' },
          baseCtx,
        ),
      ).rejects.toThrow('below zero')
    })

    it('should create inventory for OPENING_BALANCE when no record exists', async () => {
      // Delete the inventory record first
      await prisma.branchInventory.delete({ where: { id: inventoryId } })

      const result = await inventoryService.createAdjustment(
        { productId: 'svc-prod-1', quantity: 100, reason: 'OPENING_BALANCE' },
        baseCtx,
      )

      expect(result.quantity).toBe(100)
      const inv = await prisma.branchInventory.findFirst({
        where: { tenant_id: TENANT_ID, branch_id: BRANCH_ID, product_id: 'svc-prod-1' },
      })
      expect(inv!.quantity_on_hand).toBe(100)
    })

    it('should reject negative adjustment (DAMAGE) when no inventory exists', async () => {
      await prisma.branchInventory.delete({ where: { id: inventoryId } })

      await expect(
        inventoryService.createAdjustment(
          { productId: 'svc-prod-1', quantity: 50, reason: 'DAMAGE' },
          baseCtx,
        ),
      ).rejects.toThrow('No branch inventory record')
    })

    it('should create an audit log entry', async () => {
      await inventoryService.createAdjustment(
        { productId: 'svc-prod-1', quantity: 10, reason: 'LOST' },
        baseCtx,
      )

      const logs = await prisma.auditLog.findMany({
        where: { tenant_id: TENANT_ID, action: 'CREATE', entity_type: 'InventoryAdjustment' },
      })
      expect(logs).toHaveLength(1)
    })

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(
        inventoryService.createAdjustment(
          { productId: 'non-existent-product', quantity: 10, reason: 'LOST' },
          baseCtx,
        ),
      ).rejects.toThrow('Product not found')
    })
  })

  describe('listAdjustments', () => {
    beforeEach(async () => {
      const inv = await inventoryRepository.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      await inventoryRepository.createAdjustmentEntry({
        inventoryId: inv.id,
        quantity: 10,
        reason: 'DAMAGE',
        notes: 'Damaged containers',
        userId: 'test-user',
        ctx: baseCtx,
      })

      await inventoryRepository.createAdjustmentEntry({
        inventoryId: inv.id,
        quantity: 50,
        reason: 'OPENING_BALANCE',
        notes: 'Opening stock',
        userId: 'test-user',
        ctx: baseCtx,
      })
    })

    it('should list all adjustments for the tenant', async () => {
      const result = await inventoryService.listAdjustments({}, baseCtx)
      expect(result).toHaveLength(2)
    })

    it('should filter by product', async () => {
      const result = await inventoryService.listAdjustments(
        { productId: 'svc-prod-1' },
        baseCtx,
      )
      expect(result).toHaveLength(2)
    })
  })

  // =======================================================================
  // Tenant Isolation Tests
  // =======================================================================

  describe('tenant isolation', () => {
    const otherCtx: InventoryContext = {
      tenantId: OTHER_TENANT_ID,
      branchId: null,
      userId: 'other-user',
    }

    it('should not see other tenant\'s branch inventory', async () => {
      await inventoryService.createBranchInventory(
        { productId: 'svc-prod-1', quantityOnHand: 100 },
        baseCtx,
      )

      const result = await inventoryService.listBranchInventory({}, otherCtx)
      expect(result.data).toHaveLength(0)
    })

    it('should not see other tenant\'s production batches', async () => {
      await inventoryService.createProductionBatch(
        { batchNumber: 'PB-TENANT-A', outputProductId: 'svc-prod-1', outputQuantity: 100 },
        baseCtx,
      )

      const result = await inventoryService.listProductionBatches({}, otherCtx)
      expect(result.data).toHaveLength(0)
    })

    it('should not be able to get other tenant\'s batch', async () => {
      const batch = await inventoryRepository.createProductionBatch(
        { batchNumber: 'PB-ISO', outputProductId: 'svc-prod-1', outputQuantity: 100 },
        baseCtx,
      )

      await expect(
        inventoryService.getProductionBatch(batch.id, otherCtx),
      ).rejects.toThrow('ProductionBatch not found')
    })
  })
})
