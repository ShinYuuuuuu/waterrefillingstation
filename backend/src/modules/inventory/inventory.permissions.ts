/**
 * RBAC permission constants for the Inventory Management module.
 *
 * Naming convention: `<module>.<action>`  (see AI_PROJECT_RULES.md §2.4).
 * Stock transfer approvals and stock count approvals require elevated
 * permissions beyond the base CRUD permissions.
 */
export const InventoryPermission = {
  // Branch inventory CRUD
  READ: 'inventory.read',
  CREATE: 'inventory.create',
  UPDATE: 'inventory.update',
  DELETE: 'inventory.delete',

  // Production batch
  PRODUCTION_CREATE: 'inventory.production.create',
  PRODUCTION_READ: 'inventory.production.read',
  PRODUCTION_UPDATE: 'inventory.production.update',

  // Stock transfer workflow
  TRANSFER_CREATE: 'inventory.transfer.create',
  TRANSFER_APPROVE: 'inventory.transfer.approve',
  TRANSFER_RECEIVE: 'inventory.transfer.receive',

  // Stock count workflow
  STOCK_COUNT_START: 'inventory.stock_count.start',
  STOCK_COUNT_APPROVE: 'inventory.stock_count.approve',

  // Adjustment
  ADJUST: 'inventory.adjust',

  // Inventory update request workflow
  UPDATE_REQUEST_CREATE: 'inventory.update_request.create',
  UPDATE_REQUEST_READ: 'inventory.update_request.read',
  UPDATE_REQUEST_APPROVE: 'inventory.update_request.approve',

  // Ledger & alerts (read-only)
  LEDGER_READ: 'inventory.ledger.read',
  ALERTS_READ: 'inventory.alerts.read',
} as const

export type InventoryPermissionCode = (typeof InventoryPermission)[keyof typeof InventoryPermission]
