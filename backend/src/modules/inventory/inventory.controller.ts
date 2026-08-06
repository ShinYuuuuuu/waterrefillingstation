import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { successResponse } from '../../utils/response'
import { inventoryService } from './inventory.service'
import {
  CreateBranchInventoryRequest,
  UpdateBranchInventoryRequest,
  BranchInventoryListQuery,
  InventoryContext,
  CreateProductionBatchRequest,
  ProductionBatchListQuery,
  CreateStockTransferRequest,
  StockTransferListQuery,
  CreateStockCountRequest,
  CreateInventoryAdjustmentRequest,
  InventoryLedgerListQuery,
  InventoryAdjustmentListQuery,
  LowStockAlertQuery,
} from './inventory.types'

/**
 * Thin controller for the Inventory Management module.
 *
 * Controllers are intentionally minimal: they extract context from the
 * request, delegate all business logic to the service, and format the
 * HTTP response.  No business rules live here (AI_PROJECT_RULES.md §3.1).
 *
 * Validation is handled upstream by middleware (validateBody /
 * validateRequest), so req.validatedBody and req.validatedParams are
 * already typed-safe by the time the handler runs.
 */
export const inventoryController = {
  // ========================================================================
  // BRANCH INVENTORY — CRUD
  // =========================================================================

  /**
   * GET /inventory/branch
   * List branch inventory with pagination, filtering, and low-stock flag.
   */
  async listBranchInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as BranchInventoryListQuery
      const result = await inventoryService.listBranchInventory(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /inventory/branch/:inventoryId
   * Retrieve a single branch inventory entry by ID.
   */
  async getBranchInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { inventoryId } = req.validatedParams as { inventoryId: string }
      const result = await inventoryService.getBranchInventory(inventoryId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/branch
   * Create branch inventory for a product.
   */
  async createBranchInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateBranchInventoryRequest
      const result = await inventoryService.createBranchInventory(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /inventory/branch/:inventoryId
   * Update an existing branch inventory record.
   */
  async updateBranchInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { inventoryId } = req.validatedParams as { inventoryId: string }
      const body = req.validatedBody as UpdateBranchInventoryRequest
      const result = await inventoryService.updateBranchInventory(inventoryId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /inventory/branch/:inventoryId
   * Soft-delete a branch inventory record.
   */
  async deleteBranchInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { inventoryId } = req.validatedParams as { inventoryId: string }
      await inventoryService.deleteBranchInventory(inventoryId, ctx)
      return res.status(httpStatus.NO_CONTENT).json(successResponse({ message: 'Branch inventory deleted' }))
    } catch (error) {
      next(error)
    }
  },

  // =========================================================================
  // LOW STOCK ALERTS
  // =========================================================================

  /**
   * GET /inventory/alerts/low-stock
   * List branch inventory where available_quantity <= reorder_level.
   */
  async getLowStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const result = await inventoryService.getLowStockAlerts(ctx, req.query.branchId as string | undefined)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  // =========================================================================
  // INVENTORY LEDGER
  // =========================================================================

  /**
   * GET /inventory/ledger
   * List inventory ledger entries with filtering and pagination.
   */
  async listLedgerEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as InventoryLedgerListQuery
      const result = await inventoryService.listLedgerEntries(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /inventory/ledger/:ledgerId
   * Retrieve a single ledger entry by ID.
   */
  async getLedgerEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { ledgerId } = req.validatedParams as { ledgerId: string }
      const result = await inventoryService.getLedgerEntry(ledgerId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  // =========================================================================
  // PRODUCTION BATCH
  // =========================================================================

  /**
   * GET /inventory/production-batches
   * List production batches with pagination and filtering.
   */
  async listProductionBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as ProductionBatchListQuery
      const result = await inventoryService.listProductionBatches(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /inventory/production-batches/:batchId
   * Retrieve production batch details including ledger entries.
   */
  async getProductionBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { batchId } = req.validatedParams as { batchId: string }
      const result = await inventoryService.getProductionBatch(batchId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/production-batches
   * Create a new production batch.
   */
  async createProductionBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateProductionBatchRequest
      const result = await inventoryService.createProductionBatch(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PATCH /inventory/production-batches/:batchId/complete
   * Mark a production batch as completed.
   */
  async completeProductionBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { batchId } = req.validatedParams as { batchId: string }
      const result = await inventoryService.completeProductionBatch(batchId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  // =========================================================================
  // STOCK TRANSFER
  // =========================================================================

  /**
   * GET /inventory/stock-transfers
   * List stock transfers with pagination and filtering.
   */
  async listStockTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as StockTransferListQuery
      const result = await inventoryService.listStockTransfers(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result.data, result.meta))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /inventory/stock-transfers/:transferId
   * Retrieve a single stock transfer with items.
   */
  async getStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { transferId } = req.validatedParams as { transferId: string }
      const result = await inventoryService.getStockTransfer(transferId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/stock-transfers
   * Create a new stock transfer (status: PENDING/Draft).
   */
  async createStockTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateStockTransferRequest
      const result = await inventoryService.createStockTransfer(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * PATCH /inventory/stock-transfers/:transferId/status
   * Update the status of a stock transfer.
   */
  async updateStockTransferStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { transferId } = req.validatedParams as { transferId: string }
      const { status, notes } = req.validatedBody as { status: string; notes?: string | null }
      const result = await inventoryService.updateStockTransferStatus(transferId, status as never, notes ?? null, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  // =========================================================================
  // STOCK COUNT
  // =========================================================================

  /**
   * POST /inventory/stock-counts
   * Create a new stock count session (status: OPEN).
   */
  async createStockCountSession(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { notes } = req.validatedBody as { notes?: string | null }
      const result = await inventoryService.createStockCountSession(ctx, notes)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /inventory/stock-counts/:sessionId
   * Retrieve a stock count session with its items.
   */
  async getStockCountSession(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { sessionId } = req.validatedParams as { sessionId: string }
      const result = await inventoryService.getStockCountSession(sessionId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/stock-counts/:sessionId/items
   * Record counts for a stock count session.
   */
  async recordStockCountItems(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { sessionId } = req.validatedParams as { sessionId: string }
      const body = req.validatedBody as CreateStockCountRequest
      const result = await inventoryService.recordStockCountItems(sessionId, body, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/stock-counts/:sessionId/calculate
   * Calculate variance for a stock count session.
   */
  async calculateStockCountVariance(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { sessionId } = req.validatedParams as { sessionId: string }
      const result = await inventoryService.calculateStockCountVariance(sessionId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/stock-counts/:sessionId/submit
   * Submit a stock count session for approval (status: OPEN → SUBMITTED).
   */
  async submitStockCount(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { sessionId } = req.validatedParams as { sessionId: string }
      const result = await inventoryService.submitStockCount(sessionId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /inventory/stock-counts/:sessionId/approve
   * Approve a stock count session and post adjustments (status: SUBMITTED → APPROVED).
   */
  async approveStockCount(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const { sessionId } = req.validatedParams as { sessionId: string }
      const result = await inventoryService.approveStockCount(sessionId, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  // =========================================================================
  // INVENTORY ADJUSTMENT
  // =========================================================================

  /**
   * POST /inventory/adjustments
   * Create an inventory adjustment with a reason.
   */
  async createAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const body = req.validatedBody as CreateInventoryAdjustmentRequest
      const result = await inventoryService.createAdjustment(body, ctx)
      return res.status(httpStatus.CREATED).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /inventory/adjustments
   * List inventory adjustments (from ADJUSTMENT ledger entries).
   */
  async listAdjustments(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildContext(req)
      const query = req.validatedQuery as InventoryAdjustmentListQuery
      const result = await inventoryService.listAdjustments(query, ctx)
      return res.status(httpStatus.OK).json(successResponse(result))
    } catch (error) {
      next(error)
    }
  },
}

/**
 * Extracts the authenticated user's tenant / branch / user context from
 * the request object.  These fields are populated by the authenticateToken
 * and tenantIsolation middleware.
 */
function buildContext(req: Request): InventoryContext {
  const { tenantId, branchId, userId } = req

  if (!tenantId || !userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Authentication required')
  }

  return {
    tenantId,
    branchId: branchId ?? null,
    userId,
  }
}
