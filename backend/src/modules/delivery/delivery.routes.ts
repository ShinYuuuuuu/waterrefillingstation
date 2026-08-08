import { Router } from 'express'
import { authenticateToken, requirePermission, requireRole } from '../../middleware/authJwt'
import { validateBody, validateRequest } from '../../middleware/validateRequest'
import { deliveryController } from './delivery.controller'
import { DeliveryPermission } from './delivery.permissions'
import {
  createDeliveryOrderSchema,
  updateDeliveryOrderSchema,
  deliveryOrderIdSchema,
  updateDeliveryOrderStatusSchema,
  assignRiderSchema,
  deliveryOrderListQuerySchema,
  riderListQuerySchema,
} from './delivery.schema'

export const deliveryRoutes = Router()

deliveryRoutes.use(authenticateToken)

deliveryRoutes.get(
  '/',
  requirePermission(DeliveryPermission.READ),
  validateRequest(deliveryOrderListQuerySchema),
  deliveryController.list
)

deliveryRoutes.post(
  '/',
  requirePermission(DeliveryPermission.CREATE),
  validateBody(createDeliveryOrderSchema),
  deliveryController.create
)

deliveryRoutes.get(
  '/riders',
  requirePermission(DeliveryPermission.READ),
  validateRequest(riderListQuerySchema),
  deliveryController.getRiders
)

deliveryRoutes.get(
  '/:deliveryOrderId',
  requirePermission(DeliveryPermission.READ),
  validateRequest(deliveryOrderIdSchema),
  deliveryController.getOne
)

deliveryRoutes.put(
  '/:deliveryOrderId',
  requirePermission(DeliveryPermission.UPDATE),
  validateRequest(updateDeliveryOrderSchema),
  deliveryController.update
)

deliveryRoutes.patch(
  '/:deliveryOrderId/status',
  requirePermission(DeliveryPermission.STATUS),
  validateRequest(updateDeliveryOrderStatusSchema),
  deliveryController.updateStatus
)

deliveryRoutes.post(
  '/:deliveryOrderId/assign',
  requirePermission(DeliveryPermission.ASSIGN),
  validateRequest(assignRiderSchema),
  deliveryController.assignRider
)

export default deliveryRoutes
