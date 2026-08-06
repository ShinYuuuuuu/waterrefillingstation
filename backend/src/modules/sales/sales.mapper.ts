import {
  Sale,
  SaleItem,
  SalePayment,
  CreateSaleRequest,
  CreateSaleItemRequest,
  CreateSalePaymentRequest,
  UpdateSaleRequest,
  RecordPaymentRequest,
  VoidSaleRequest,
  SaleResponse,
  SaleItemResponse,
  SalePaymentResponse,
  SaleContext,
} from './sales.types'

/**
 * Maps between the database entity (snake_case, Prisma output) and the
 * camelCase API DTOs.
 *
 * Keeping the mapping logic in a dedicated class ensures that controllers
 * never leak Prisma field names to the client and that write-input objects
 * never receive unrecognised camelCase fields.
 */
export class SaleMapper {
  /** DB entity → API response DTO */
  static toResponse(sale: Sale, items: SaleItem[] = [], payments: SalePayment[] = []): SaleResponse {
    return {
      id: sale.id,
      tenantId: sale.tenant_id,
      branchId: sale.branch_id,
      customerId: sale.customer_id,
      invoiceNumber: sale.invoice_number,
      channel: sale.channel,
      status: sale.status,
      subtotal: Number(sale.subtotal),
      discountTotal: Number(sale.discount_total),
      taxTotal: Number(sale.tax_total),
      grandTotal: Number(sale.grand_total),
      amountTendered: sale.amount_tendered ? Number(sale.amount_tendered) : null,
      changeAmount: sale.change_amount ? Number(sale.change_amount) : null,
      voidReason: sale.void_reason,
      voidedAt: sale.voided_at ? sale.voided_at.toISOString() : null,
      voidedBy: sale.voided_by,
      notes: sale.notes,
      createdBy: sale.created_by,
      createdAt: sale.created_at.toISOString(),
      updatedAt: sale.updated_at.toISOString(),
      items: items.map(SaleMapper.toItemResponse),
      payments: payments.map(SaleMapper.toPaymentResponse),
    }
  }

  /** DB sale item → API response DTO */
  static toItemResponse(item: SaleItem): SaleItemResponse {
    return {
      id: item.id,
      saleId: item.sale_id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      discountAmount: Number(item.discount_amount),
      lineTotal: Number(item.line_total),
      isRefunded: item.is_refunded,
      refundedQuantity: item.refunded_quantity,
      createdAt: item.created_at.toISOString(),
    }
  }

  /** DB sale payment → API response DTO */
  static toPaymentResponse(payment: SalePayment): SalePaymentResponse {
    return {
      id: payment.id,
      saleId: payment.sale_id,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      createdAt: payment.created_at.toISOString(),
    }
  }

  /**
   * API create payload → Prisma write input (snake_case).
   * The `context` (tenant_id, branch_id, created_by) is injected by the
   * service layer; it must never come from the client.
   */
  static toCreateInput(data: CreateSaleRequest, context: SaleContext): Record<string, unknown> {
    return {
      tenant_id: context.tenantId,
      branch_id: context.branchId,
      customer_id: data.customerId ?? null,
      channel: data.channel,
      status: 'COMPLETED',
      subtotal: data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      discount_total: data.discountTotal ?? 0,
      tax_total: data.taxTotal ?? 0,
      grand_total: data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - (data.discountTotal ?? 0) + (data.taxTotal ?? 0),
      notes: data.notes ?? null,
      created_by: context.userId,
    }
  }

  /**
   * API create item payload → Prisma write input (snake_case).
   */
  static toItemCreateInput(saleId: string, item: CreateSaleItemRequest): Record<string, unknown> {
    return {
      sale_id: saleId,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_amount: item.discountAmount ?? 0,
      line_total: item.quantity * item.unitPrice - (item.discountAmount ?? 0),
    }
  }

  /**
   * API create payment payload → Prisma write input (snake_case).
   */
  static toPaymentCreateInput(saleId: string, payment: CreateSalePaymentRequest): Record<string, unknown> {
    return {
      sale_id: saleId,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference ?? null,
    }
  }

  /**
   * API update payload → Prisma write input (snake_case).
   * Only provided fields are included; undefined values are omitted.
   */
  static toUpdateInput(data: UpdateSaleRequest): Record<string, unknown> {
    const input: Record<string, unknown> = { updated_at: new Date() }
    if (data.channel !== undefined) input.channel = data.channel
    if (data.notes !== undefined) input.notes = data.notes
    return input
  }

  /**
   * API record payment payload → Prisma write input (snake_case).
   */
  static toPaymentRecordInput(saleId: string, data: RecordPaymentRequest): Record<string, unknown> {
    return {
      sale_id: saleId,
      amount: data.amount,
      method: data.method,
      reference: data.reference ?? null,
    }
  }

  /**
   * API void payload → Prisma update input (snake_case).
   */
  static toVoidInput(data: VoidSaleRequest): Record<string, unknown> {
    return {
      status: 'VOID',
      void_reason: data.reason,
      voided_at: new Date(),
      updated_at: new Date(),
    }
  }
}
