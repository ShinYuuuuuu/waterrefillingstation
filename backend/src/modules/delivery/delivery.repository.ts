import { prisma } from '../../database'
import { logger } from '../../utils/logger'
import { NotFoundError, AppError } from '../../middleware/errorHandler'
import { pagination } from '../../constants'
import {
  DeliveryContext,
  DeliveryOrderListQuery,
  DeliveryOrder,
  CreateDeliveryOrderRequest,
  CreateDeliveryOrderItemRequest,
  UpdateDeliveryOrderRequest,
  UpdateDeliveryOrderStatusRequest,
  AssignRiderRequest,
  VALID_DELIVERY_STATUS_TRANSITIONS,
} from './delivery.types'

export class DeliveryRepository {
  private readonly db = prisma

  private buildScopeWhere(ctx: DeliveryContext, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      ...(ctx.branchId ? { branch_id: ctx.branchId } : {}),
      ...extra,
    }
  }

  async findMany(query: DeliveryOrderListQuery, ctx: DeliveryContext): Promise<{ data: DeliveryOrder[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: Record<string, unknown> = this.buildScopeWhere(ctx)

    if (query.status) {
      where.status = query.status
    }
    if (query.customerId) {
      where.customer_id = query.customerId
    }
    if (query.assignedRiderId) {
      where.assigned_rider_id = query.assignedRiderId
    }
    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, unknown> = {}
      if (query.startDate) dateFilter.gte = new Date(query.startDate)
      if (query.endDate) dateFilter.lte = new Date(query.endDate)
      where.created_at = dateFilter
    }
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { failure_reason: { contains: query.search, mode: 'insensitive' } },
        { special_instructions: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const page = query.page ?? pagination.DEFAULT_PAGE
    const limit = Math.min(query.limit ?? pagination.DEFAULT_LIMIT, pagination.MAX_LIMIT)
    const skip = (page - 1) * limit

    const sortBy = query.sortBy ?? 'created_at'
    const sortOrder = query.sortOrder ?? 'desc'
    const orderBy = { [sortBy]: sortOrder }

    logger.debug('Querying delivery orders', { tenantId: ctx.tenantId, branchId: ctx.branchId, page, limit })

    const [total, data] = await this.db.$transaction([
      this.db.deliveryOrder.count({ where }),
      this.db.deliveryOrder.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          items: true,
          assigned_rider: { select: { id: true, full_name: true } },
          customer: { select: { id: true, full_name: true, phone: true, email: true } },
          address: true,
        },
      }),
    ])

    const mapped = data.map((order: any) => ({
      id: order.id,
      tenantId: order.tenant_id,
      branchId: order.branch_id,
      customerId: order.customer_id,
      customerName: order.customer?.full_name,
      customerPhone: order.customer?.phone,
      customerEmail: order.customer?.email,
      addressId: order.address_id,
      addressLine: order.address ? `${order.address.street || ''} ${order.address.barangay || ''} ${order.address.city || ''}`.trim() : null,
      orderType: order.order_type,
      standingOrderId: order.standing_order_id,
      requestedDate: order.requested_date?.toISOString() ?? null,
      requestedTimeSlot: order.requested_time_slot,
      status: order.status,
      assignedRiderId: order.assigned_rider_id,
      assignedRiderName: order.assigned_rider?.full_name ?? null,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      salesTransactionId: order.sales_transaction_id,
      failureReason: order.failure_reason,
      proofPhotoUrl: order.proof_photo_url,
      proofSignatureUrl: order.proof_signature_url,
      specialInstructions: order.special_instructions,
      deliveredAt: order.delivered_at?.toISOString() ?? null,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items: order.items.map((item: any) => ({
        id: item.id,
        deliveryOrderId: item.delivery_order_id,
        productId: item.product_id,
        productName: item.product?.name,
        productSku: item.product?.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.quantity) * Number(item.unit_price),
        createdAt: item.created_at.toISOString(),
      })),
    }))

    return { data: mapped, total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
  }

  async findUnique(id: string, ctx: DeliveryContext): Promise<DeliveryOrder | null> {
    const order = await this.db.deliveryOrder.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
      include: {
        items: true,
        assigned_rider: { select: { id: true, full_name: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        address: true,
      },
    })

    if (!order) return null

    return {
      id: order.id,
      tenantId: order.tenant_id,
      branchId: order.branch_id,
      customerId: order.customer_id,
      customerName: (order as any).customer?.full_name,
      customerPhone: (order as any).customer?.phone,
      customerEmail: (order as any).customer?.email,
      addressId: order.address_id,
      addressLine: (order as any).address ? `${(order as any).address.street || ''} ${(order as any).address.barangay || ''} ${(order as any).address.city || ''}`.trim() : null,
      orderType: order.order_type,
      standingOrderId: order.standing_order_id,
      requestedDate: order.requested_date?.toISOString() ?? null,
      requestedTimeSlot: order.requested_time_slot,
      status: order.status,
      assignedRiderId: order.assigned_rider_id,
      assignedRiderName: (order as any).assigned_rider?.full_name ?? null,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      salesTransactionId: order.sales_transaction_id,
      failureReason: order.failure_reason,
      proofPhotoUrl: order.proof_photo_url,
      proofSignatureUrl: order.proof_signature_url,
      specialInstructions: order.special_instructions,
      deliveredAt: order.delivered_at?.toISOString() ?? null,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items: (order as any).items.map((item: any) => ({
        id: item.id,
        deliveryOrderId: item.delivery_order_id,
        productId: item.product_id,
        productName: item.product?.name,
        productSku: item.product?.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.quantity) * Number(item.unit_price),
        createdAt: item.created_at.toISOString(),
      })),
    }
  }

  async create(data: CreateDeliveryOrderRequest, ctx: DeliveryContext): Promise<DeliveryOrder> {
    const order = await this.db.deliveryOrder.create({
      data: {
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId ?? '',
        customer_id: data.customerId,
        address_id: data.addressId ?? null,
        order_type: data.orderType ?? 'ONE_TIME',
        standing_order_id: data.standingOrderId ?? null,
        requested_date: data.requestedDate ? new Date(data.requestedDate) : null,
        requested_time_slot: data.requestedTimeSlot ?? null,
        payment_method: data.paymentMethod ?? null,
        payment_status: data.paymentStatus ?? 'PENDING',
        sales_transaction_id: data.salesTransactionId ?? null,
        special_instructions: data.specialInstructions ?? null,
        items: {
          create: data.items.map((item: CreateDeliveryOrderItemRequest) => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
        assigned_rider: { select: { id: true, full_name: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        address: true,
      },
    })

    return this.mapToDeliveryOrder(order as any)
  }

  async update(id: string, data: UpdateDeliveryOrderRequest, ctx: DeliveryContext): Promise<DeliveryOrder | null> {
    const where = this.buildScopeWhere(ctx, { id })

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.addressId !== undefined) updateData.address_id = data.addressId
    if (data.requestedDate !== undefined) updateData.requested_date = data.requestedDate ? new Date(data.requestedDate) : null
    if (data.requestedTimeSlot !== undefined) updateData.requested_time_slot = data.requestedTimeSlot
    if (data.paymentMethod !== undefined) updateData.payment_method = data.paymentMethod
    if (data.paymentStatus !== undefined) updateData.payment_status = data.paymentStatus
    if (data.specialInstructions !== undefined) updateData.special_instructions = data.specialInstructions
    if (data.failureReason !== undefined) updateData.failure_reason = data.failureReason
    if (data.proofPhotoUrl !== undefined) updateData.proof_photo_url = data.proofPhotoUrl
    if (data.proofSignatureUrl !== undefined) updateData.proof_signature_url = data.proofSignatureUrl

    const updated = await this.db.deliveryOrder.updateMany({
      where,
      data: updateData,
    })

    if (updated.count === 0) return null

    const order = await this.db.deliveryOrder.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
      include: {
        items: true,
        assigned_rider: { select: { id: true, full_name: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        address: true,
      },
    })

    if (!order) return null
    return this.mapToDeliveryOrder(order as any)
  }

  async updateStatus(id: string, status: string, ctx: DeliveryContext, notes?: string): Promise<DeliveryOrder | null> {
    const where = this.buildScopeWhere(ctx, { id })

    const updated = await this.db.deliveryOrder.updateMany({
      where,
      data: {
        status: status as any,
        updated_at: new Date(),
        ...(status === 'DELIVERED' ? { delivered_at: new Date() } : {}),
        ...(notes ? { failure_reason: notes } : {}),
      },
    })

    if (updated.count === 0) return null

    const order = await this.db.deliveryOrder.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
      include: {
        items: true,
        assigned_rider: { select: { id: true, full_name: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        address: true,
      },
    })

    if (!order) return null
    return this.mapToDeliveryOrder(order as any)
  }

  async assignRider(id: string, riderId: string, ctx: DeliveryContext): Promise<DeliveryOrder | null> {
    const where = this.buildScopeWhere(ctx, { id })

    const updated = await this.db.deliveryOrder.updateMany({
      where,
      data: {
        assigned_rider_id: riderId,
        status: 'ASSIGNED',
        updated_at: new Date(),
      },
    })

    if (updated.count === 0) return null

    const order = await this.db.deliveryOrder.findFirst({
      where: this.buildScopeWhere(ctx, { id }),
      include: {
        items: true,
        assigned_rider: { select: { id: true, full_name: true } },
        customer: { select: { id: true, full_name: true, phone: true, email: true } },
        address: true,
      },
    })

    if (!order) return null
    return this.mapToDeliveryOrder(order as any)
  }

  async findRiders(ctx: DeliveryContext, search?: string): Promise<{ id: string; fullName: string; email: string }[]> {
    const where: Record<string, unknown> = {
      tenant_id: ctx.tenantId,
      deleted_at: null,
      status: 'active',
      user_roles: {
        some: { role: { code: 'rider' } },
      },
    }

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const riders = await this.db.user.findMany({
      where,
      select: { id: true, full_name: true, email: true },
      orderBy: { full_name: 'asc' },
    })

    return riders.map((r: any) => ({ id: r.id, fullName: r.full_name, email: r.email }))
  }

  validateStatusTransition(current: string, next: string): void {
    if (current === next) {
      throw new AppError(400, `Delivery order is already in ${next} status`)
    }

    const allowed = VALID_DELIVERY_STATUS_TRANSITIONS[current as keyof typeof VALID_DELIVERY_STATUS_TRANSITIONS] || []
    if (!allowed.includes(next as any)) {
      throw new AppError(422, `Invalid status transition: ${current} → ${next}`)
    }
  }

  private mapToDeliveryOrder(order: any): DeliveryOrder {
    return {
      id: order.id,
      tenantId: order.tenant_id,
      branchId: order.branch_id,
      customerId: order.customer_id,
      customerName: order.customer?.full_name,
      customerPhone: order.customer?.phone,
      customerEmail: order.customer?.email,
      addressId: order.address_id,
      addressLine: order.address ? `${order.address.street || ''} ${order.address.barangay || ''} ${order.address.city || ''}`.trim() : null,
      orderType: order.order_type,
      standingOrderId: order.standing_order_id,
      requestedDate: order.requested_date?.toISOString() ?? null,
      requestedTimeSlot: order.requested_time_slot,
      status: order.status,
      assignedRiderId: order.assigned_rider_id,
      assignedRiderName: order.assigned_rider?.full_name ?? null,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      salesTransactionId: order.sales_transaction_id,
      failureReason: order.failure_reason,
      proofPhotoUrl: order.proof_photo_url,
      proofSignatureUrl: order.proof_signature_url,
      specialInstructions: order.special_instructions,
      deliveredAt: order.delivered_at?.toISOString() ?? null,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items: order.items?.map((item: any) => ({
        id: item.id,
        deliveryOrderId: item.delivery_order_id,
        productId: item.product_id,
        productName: item.product?.name,
        productSku: item.product?.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.quantity) * Number(item.unit_price),
        createdAt: item.created_at.toISOString(),
      })) || [],
    }
  }
}

export const deliveryRepository = new DeliveryRepository()
