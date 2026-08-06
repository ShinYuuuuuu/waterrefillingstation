export interface GallonItem {
  id: string
  tenantId: string
  branchId: string
  gallonTypeId: string
  tagCode: string
  serialNumber: string | null
  status: string
  currentHolderType: string | null
  currentHolderId: string | null
  currentCondition: string | null
  purchaseDate: string | null
  purchasePrice: number | null
  lastCleanedAt: string | null
  lastInspectedAt: string | null
  lastFilledAt: string | null
  totalFillCount: number
  totalCleanings: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GallonListResponse {
  data: GallonItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface GallonListQuery {
  page?: number
  limit?: number
  status?: string
  search?: string
}

export interface CreateGallonRequest {
  gallonTypeId: string
  tagCode: string
  serialNumber?: string | null
  status?: string
  holderType?: string | null
  holderId?: string | null
  condition?: string | null
  purchaseDate?: string | null
  purchasePrice?: number | string | null
  isActive?: boolean
}

export interface UpdateGallonRequest {
  tagCode?: string
  serialNumber?: string | null
  status?: string
  holderType?: string | null
  holderId?: string | null
  condition?: string | null
  purchasePrice?: number | string | null
  isActive?: boolean
}
