import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { AppError, NotFoundError } from '../../middleware/errorHandler'
import { httpStatus } from '../../constants'
import { DeliveryRepository, deliveryRepository } from './delivery.repository'
import {
  DeliveryContext,
  CreateDeliveryOrderRequest,
  UpdateDeliveryOrderRequest,
  UpdateDeliveryOrderStatusRequest,
  AssignRiderRequest,
  VALID_DELIVERY_STATUS_TRANSITIONS,
} from './delivery.types'

export class DeliveryService {
  constructor(private readonly repository: DeliveryRepository = deliveryRepository) {}

  async getDeliveryOrders(query: any, ctx: DeliveryContext) {
    // Riders can only retrieve their own queue. Do not trust a rider ID sent
    // by the client because stale/missing filters previously hid assignments.
    const scopedQuery = ctx.userRole === 'rider'
      ? { ...query, assignedRiderId: ctx.userId }
      : query
    return this.repository.findMany(scopedQuery, ctx)
  }

  async getDeliveryOrder(id: string, ctx: DeliveryContext) {
    const order = await this.repository.findUnique(id, ctx)
    if (!order) {
      throw new NotFoundError('Delivery order')
    }
    return order
  }

  async createDeliveryOrder(data: CreateDeliveryOrderRequest, ctx: DeliveryContext) {
    logger.debug('Creating delivery order', { tenantId: ctx.tenantId, customerId: data.customerId })

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenant_id: ctx.tenantId, deleted_at: null },
    })
    if (!customer) {
      throw new NotFoundError('Customer')
    }

    if (data.addressId) {
      const address = await prisma.customerAddress.findFirst({
        where: { id: data.addressId, customer_id: data.customerId, tenant_id: ctx.tenantId, deleted_at: null },
      })
      if (!address) {
        throw new NotFoundError('Customer address')
      }
    }

    for (const item of data.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, tenant_id: ctx.tenantId, deleted_at: null },
      })
      if (!product) {
        throw new NotFoundError(`Product ${item.productId}`)
      }
    }

    const order = await this.repository.create(data, ctx)

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'DeliveryOrder',
      entityId: order.id,
      afterData: order,
    })

    const finalOrder = await this.repository.findUnique(order.id, ctx)
    if (!finalOrder) {
      throw new NotFoundError('Delivery order')
    }

    return finalOrder
  }

  async updateDeliveryOrder(id: string, data: UpdateDeliveryOrderRequest, ctx: DeliveryContext) {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Delivery order')
    }

    if (existing.status === 'DELIVERED' || existing.status === 'CANCELLED') {
      throw new AppError(httpStatus.BAD_REQUEST, `Cannot update delivery order in ${existing.status} status`)
    }

    const updated = await this.repository.update(id, data, ctx)
    if (!updated) {
      throw new NotFoundError('Delivery order')
    }

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'DeliveryOrder',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    })

    return updated
  }

  async updateDeliveryOrderStatus(id: string, data: UpdateDeliveryOrderStatusRequest, ctx: DeliveryContext) {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Delivery order')
    }

    const currentStatus = existing.status
    const nextStatus = data.status

    this.repository.validateStatusTransition(currentStatus, nextStatus)

    if (nextStatus === 'ASSIGNED' && !existing.assignedRiderId && ctx.userRole !== 'owner' && ctx.userRole !== 'cashier') {
      throw new AppError(httpStatus.FORBIDDEN, 'Only owner or cashier can assign riders')
    }

    const updated = await this.repository.updateStatus(id, nextStatus, ctx, data.failureReason ?? undefined)
    if (!updated) {
      throw new NotFoundError('Delivery order')
    }

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'STATUS_CHANGE',
      entityType: 'DeliveryOrder',
      entityId: id,
      beforeData: existing,
      afterData: updated,
      notes: data.failureReason ?? undefined,
    })

    return updated
  }

  async assignRider(id: string, data: AssignRiderRequest, ctx: DeliveryContext) {
    const existing = await this.repository.findUnique(id, ctx)
    if (!existing) {
      throw new NotFoundError('Delivery order')
    }

    if (existing.status !== 'PENDING' && existing.status !== 'ASSIGNED' && existing.status !== 'FAILED') {
      throw new AppError(httpStatus.BAD_REQUEST, `Cannot assign rider to delivery order in ${existing.status} status`)
    }

    const rider = await prisma.user.findFirst({
      where: { id: data.riderId, tenant_id: ctx.tenantId, deleted_at: null },
      include: { user_roles: { include: { role: true } } },
    })
    if (!rider || !rider.user_roles.some((ur: any) => ur.role.code === 'rider')) {
      throw new NotFoundError('Rider')
    }

    const updated = await this.repository.assignRider(id, data.riderId, ctx)
    if (!updated) {
      throw new NotFoundError('Delivery order')
    }

    await this.logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'ASSIGN_RIDER',
      entityType: 'DeliveryOrder',
      entityId: id,
      beforeData: existing,
      afterData: updated,
    })

    return updated
  }

  async getRiders(ctx: DeliveryContext, search?: string) {
    return this.repository.findRiders(ctx, search)
  }

  private async logAudit(params: {
    tenantId: string
    userId: string
    action: string
    entityType: string
    entityId: string
    beforeData?: unknown
    afterData?: unknown
    notes?: string
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenant_id: params.tenantId,
          user_id: params.userId,
          action: params.action,
          entity_type: params.entityType,
          entity_id: params.entityId,
          before_data: params.beforeData ? { data: JSON.parse(JSON.stringify(params.beforeData)) } : undefined,
          after_data: params.afterData ? { data: JSON.parse(JSON.stringify(params.afterData)) } : undefined,
          notes: params.notes ?? undefined,
        },
      })
    } catch (error) {
      logger.error('Failed to write audit log', { error, params })
    }
  }
}

export const deliveryService = new DeliveryService()
