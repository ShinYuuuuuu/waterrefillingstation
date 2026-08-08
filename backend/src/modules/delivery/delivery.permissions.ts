/**
 * RBAC permission constants for the Delivery module.
 */
export const DeliveryPermission = {
  READ: 'delivery.read',
  CREATE: 'delivery.create',
  UPDATE: 'delivery.update',
  DELETE: 'delivery.delete',
  ASSIGN: 'delivery.assign',
  STATUS: 'delivery.status',
} as const

export type DeliveryPermissionCode = (typeof DeliveryPermission)[keyof typeof DeliveryPermission]
