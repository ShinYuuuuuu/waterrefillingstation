import { Customer, CustomerResponse, CreateCustomerRequest, UpdateCustomerRequest, CustomerContext } from './customer.types'
import { randomUUID } from 'crypto'

/**
 * Maps between the database entity (snake_case, Prisma output) and the
 * camelCase API DTOs.
 *
 * Keeping the mapping logic in a dedicated class ensures that controllers
 * never leak Prisma field names to the client and that write-input objects
 * never receive unrecognised camelCase fields.
 */
export class CustomerMapper {
  /** DB entity → API response DTO */
  static toResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      tenantId: customer.tenant_id,
      branchId: customer.branch_id,
      customerType: customer.customer_type,
      fullName: customer.full_name,
      companyName: customer.company_name,
      phone: customer.phone,
      email: customer.email,
      tin: customer.tin,
      creditLimit: Number(customer.credit_limit),
      currentBalance: Number(customer.current_balance),
      loyaltyPoints: customer.loyalty_points,
      loyaltyTier: customer.loyalty_tier,
      rewardPurchaseProgress: customer.reward_purchase_progress,
      rewardGallonProgress: customer.reward_gallon_progress,
      freeGallonsBalance: customer.free_gallons_balance,
      status: customer.status,
      metadata: customer.metadata,
      createdAt: customer.created_at.toISOString(),
      updatedAt: customer.updated_at.toISOString(),
      createdBy: customer.created_by,
    }
  }

  /**
   * API create payload → Prisma write input (snake_case).
   * The `context` (tenant_id, branch_id, created_by) is injected by the
   * service layer; it must never come from the client.
   */
  static toCreateInput(data: CreateCustomerRequest, context: CustomerContext): Record<string, unknown> {
    return {
      tenant_id: context.tenantId,
      branch_id: context.branchId,
      customer_type: data.customerType ?? 'RETAIL',
      full_name: data.fullName,
      company_name: data.companyName ?? null,
      phone: data.phone?.trim() || `MESSENGER-${randomUUID()}`,
      email: data.email ?? null,
      tin: data.tin ?? null,
      credit_limit: data.creditLimit ?? 0,
      loyalty_points: 0,
      status: 'active',
      metadata: data.metadata ?? null,
      created_by: context.userId,
    }
  }

  /**
   * API update payload → Prisma write input (snake_case).
   * Only provided fields are included; undefined values are omitted.
   */
  static toUpdateInput(data: UpdateCustomerRequest): Record<string, unknown> {
    const input: Record<string, unknown> = { updated_at: new Date() }
    if (data.customerType !== undefined) input.customer_type = data.customerType
    if (data.fullName !== undefined) input.full_name = data.fullName
    if (data.companyName !== undefined) input.company_name = data.companyName
    if (data.phone !== undefined) input.phone = data.phone
    if (data.email !== undefined) input.email = data.email
    if (data.tin !== undefined) input.tin = data.tin
    if (data.creditLimit !== undefined) input.credit_limit = data.creditLimit
    if (data.currentBalance !== undefined) input.current_balance = data.currentBalance
    if (data.loyaltyPoints !== undefined) input.loyalty_points = data.loyaltyPoints
    if (data.loyaltyTier !== undefined) input.loyalty_tier = data.loyaltyTier
    if (data.status !== undefined) input.status = data.status
    if (data.metadata !== undefined) input.metadata = data.metadata
    return input
  }
}
