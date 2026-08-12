import { Router } from 'express'
import { authenticateToken, requirePermission } from '../../middleware/authJwt'
import { validateBody, validateRequest } from '../../middleware/validateRequest'
import { inventoryController } from './inventory.controller'
import { InventoryPermission } from './inventory.permissions'
import {
  createBranchInventorySchema,
  updateBranchInventorySchema,
  branchInventoryIdSchema,
  branchInventoryListQuerySchema,
  createProductionBatchSchema,
  productionBatchIdSchema,
  productionBatchListQuerySchema,
  createStockTransferSchema,
  stockTransferIdSchema,
  stockTransferStatusSchema,
  stockTransferListQuerySchema,
  createStockCountSessionSchema,
  createStockCountItemsSchema,
  stockCountSessionIdSchema,
  createInventoryAdjustmentSchema,
  inventoryAdjustmentIdSchema,
  inventoryAdjustmentListQuerySchema,
  inventoryLedgerIdSchema,
  inventoryLedgerListQuerySchema,
  createInventoryUpdateRequestSchema,
  inventoryUpdateRequestIdSchema,
  inventoryUpdateRequestListQuerySchema,
  reviewInventoryUpdateRequestSchema,
  inventoryLoanIdSchema,
  sellInventoryLoanSchema,
} from './inventory.schema'

/**
 * Express router for the Inventory Management module.
 *
 * All routes are mounted at /api/v1/inventory (registered in src/app.ts).
 * Every route requires a valid JWT and the appropriate RBAC permission.
 */
export const inventoryRoutes = Router()

// Require a valid access token on every inventory route.
inventoryRoutes.use(authenticateToken)

inventoryRoutes.get('/loans', requirePermission(InventoryPermission.READ), inventoryController.listInventoryLoans)
inventoryRoutes.post('/loans/:loanId/return', requirePermission(InventoryPermission.UPDATE), validateRequest(inventoryLoanIdSchema), inventoryController.returnInventoryLoan)
inventoryRoutes.post('/loans/:loanId/sell', requirePermission(InventoryPermission.UPDATE), validateRequest(sellInventoryLoanSchema), inventoryController.sellInventoryLoan)

// =========================================================================
// BRANCH INVENTORY — CRUD
// =========================================================================

inventoryRoutes.get(
  '/branch',
  requirePermission(InventoryPermission.READ),
  validateRequest(branchInventoryListQuerySchema),
  inventoryController.listBranchInventory,
)

inventoryRoutes.post(
  '/branch',
  requirePermission(InventoryPermission.CREATE),
  validateBody(createBranchInventorySchema),
  inventoryController.createBranchInventory,
)

inventoryRoutes.get(
  '/branch/:inventoryId',
  requirePermission(InventoryPermission.READ),
  validateRequest(branchInventoryIdSchema),
  inventoryController.getBranchInventory,
)

inventoryRoutes.put(
  '/branch/:inventoryId',
  requirePermission(InventoryPermission.UPDATE),
  validateRequest(updateBranchInventorySchema),
  inventoryController.updateBranchInventory,
)

inventoryRoutes.delete(
  '/branch/:inventoryId',
  requirePermission(InventoryPermission.DELETE),
  validateRequest(branchInventoryIdSchema),
  inventoryController.deleteBranchInventory,
)

// =========================================================================
// LOW STOCK ALERTS
// =========================================================================

inventoryRoutes.get(
  '/alerts/low-stock',
  requirePermission(InventoryPermission.ALERTS_READ),
  inventoryController.getLowStockAlerts,
)

// =========================================================================
// INVENTORY LEDGER
// =========================================================================

inventoryRoutes.get(
  '/ledger',
  requirePermission(InventoryPermission.LEDGER_READ),
  validateRequest(inventoryLedgerListQuerySchema),
  inventoryController.listLedgerEntries,
)

inventoryRoutes.get(
  '/ledger/:ledgerId',
  requirePermission(InventoryPermission.LEDGER_READ),
  validateRequest(inventoryLedgerIdSchema),
  inventoryController.getLedgerEntry,
)

// =========================================================================
// PRODUCTION BATCH
// =========================================================================

inventoryRoutes.get(
  '/production-batches',
  requirePermission(InventoryPermission.PRODUCTION_READ),
  validateRequest(productionBatchListQuerySchema),
  inventoryController.listProductionBatches,
)

inventoryRoutes.post(
  '/production-batches',
  requirePermission(InventoryPermission.PRODUCTION_CREATE),
  validateBody(createProductionBatchSchema),
  inventoryController.createProductionBatch,
)

inventoryRoutes.get(
  '/production-batches/:batchId',
  requirePermission(InventoryPermission.PRODUCTION_READ),
  validateRequest(productionBatchIdSchema),
  inventoryController.getProductionBatch,
)

inventoryRoutes.patch(
  '/production-batches/:batchId/complete',
  requirePermission(InventoryPermission.PRODUCTION_UPDATE),
  validateRequest(productionBatchIdSchema),
  inventoryController.completeProductionBatch,
)

// =========================================================================
// STOCK TRANSFER
// =========================================================================

inventoryRoutes.get(
  '/stock-transfers',
  requirePermission(InventoryPermission.READ),
  validateRequest(stockTransferListQuerySchema),
  inventoryController.listStockTransfers,
)

inventoryRoutes.post(
  '/stock-transfers',
  requirePermission(InventoryPermission.TRANSFER_CREATE),
  validateBody(createStockTransferSchema),
  inventoryController.createStockTransfer,
)

inventoryRoutes.get(
  '/stock-transfers/:transferId',
  requirePermission(InventoryPermission.READ),
  validateRequest(stockTransferIdSchema),
  inventoryController.getStockTransfer,
)

inventoryRoutes.patch(
  '/stock-transfers/:transferId/status',
  requirePermission(InventoryPermission.TRANSFER_APPROVE),
  validateRequest(stockTransferStatusSchema),
  inventoryController.updateStockTransferStatus,
)

// =========================================================================
// STOCK COUNT
// =========================================================================

inventoryRoutes.post(
  '/stock-counts',
  requirePermission(InventoryPermission.STOCK_COUNT_START),
  validateBody(createStockCountSessionSchema),
  inventoryController.createStockCountSession,
)

inventoryRoutes.get(
  '/stock-counts/:sessionId',
  requirePermission(InventoryPermission.READ),
  validateRequest(stockCountSessionIdSchema),
  inventoryController.getStockCountSession,
)

inventoryRoutes.post(
  '/stock-counts/:sessionId/items',
  requirePermission(InventoryPermission.STOCK_COUNT_START),
  validateRequest(stockCountSessionIdSchema),
  validateBody(createStockCountItemsSchema),
  inventoryController.recordStockCountItems,
)

inventoryRoutes.post(
  '/stock-counts/:sessionId/calculate',
  requirePermission(InventoryPermission.STOCK_COUNT_APPROVE),
  validateRequest(stockCountSessionIdSchema),
  inventoryController.calculateStockCountVariance,
)

inventoryRoutes.post(
  '/stock-counts/:sessionId/submit',
  requirePermission(InventoryPermission.STOCK_COUNT_START),
  validateRequest(stockCountSessionIdSchema),
  inventoryController.submitStockCount,
)

inventoryRoutes.post(
  '/stock-counts/:sessionId/approve',
  requirePermission(InventoryPermission.STOCK_COUNT_APPROVE),
  validateRequest(stockCountSessionIdSchema),
  inventoryController.approveStockCount,
)

// =========================================================================
// INVENTORY ADJUSTMENT
// =========================================================================

inventoryRoutes.get(
  '/adjustments',
  requirePermission(InventoryPermission.READ),
  validateRequest(inventoryAdjustmentListQuerySchema),
  inventoryController.listAdjustments,
)

inventoryRoutes.post(
  '/adjustments',
  requirePermission(InventoryPermission.ADJUST),
  validateBody(createInventoryAdjustmentSchema),
  inventoryController.createAdjustment,
)

// =========================================================================
// INVENTORY UPDATE REQUESTS
// =========================================================================

inventoryRoutes.post(
  '/update-requests',
  requirePermission(InventoryPermission.UPDATE_REQUEST_CREATE),
  validateBody(createInventoryUpdateRequestSchema),
  inventoryController.createUpdateRequest,
)

inventoryRoutes.get(
  '/update-requests',
  requirePermission(InventoryPermission.UPDATE_REQUEST_READ),
  validateRequest(inventoryUpdateRequestListQuerySchema),
  inventoryController.listUpdateRequests,
)

inventoryRoutes.get(
  '/update-requests/:requestId',
  requirePermission(InventoryPermission.UPDATE_REQUEST_READ),
  validateRequest(inventoryUpdateRequestIdSchema),
  inventoryController.getUpdateRequest,
)

inventoryRoutes.post(
  '/update-requests/:requestId/approve',
  requirePermission(InventoryPermission.UPDATE_REQUEST_APPROVE),
  validateRequest(reviewInventoryUpdateRequestSchema),
  inventoryController.approveUpdateRequest,
)

inventoryRoutes.post(
  '/update-requests/:requestId/reject',
  requirePermission(InventoryPermission.UPDATE_REQUEST_APPROVE),
  validateRequest(reviewInventoryUpdateRequestSchema),
  inventoryController.rejectUpdateRequest,
)

export default inventoryRoutes
