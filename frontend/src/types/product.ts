import type { ProductType } from '@/types'

export type { ProductType }

export interface Product {
  id: string
  tenantId: string
  categoryId: string
  sku: string
  name: string
  description: string | null
  type: ProductType
  unitOfMeasure: string
  basePrice: number
  costPrice: number
  isContainer: boolean
  depositAmount: number | null
  reorderLevel: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface ProductListQuery {
  page?: number
  limit?: number
  category?: string
  type?: string
  isActive?: boolean
  search?: string
  isContainer?: boolean
  sortBy?: 'created_at' | 'updated_at' | 'name' | 'sku'
  sortOrder?: 'asc' | 'desc'
}

export interface ProductListResponse {
  data: Product[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateProductRequest {
  categoryId: string
  sku: string
  name: string
  description?: string | null
  type: ProductType
  unitOfMeasure: string
  basePrice: number | string
  costPrice: number | string
  isContainer?: boolean
  depositAmount?: number | string | null
  reorderLevel?: number
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateProductRequest {
  categoryId?: string
  sku?: string
  name?: string
  description?: string | null
  type?: ProductType
  unitOfMeasure?: string
  basePrice?: number | string
  costPrice?: number | string
  isContainer?: boolean
  depositAmount?: number | string | null
  reorderLevel?: number
  isActive?: boolean
  metadata?: Record<string, unknown>
}
