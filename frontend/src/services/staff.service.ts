import { apiClient } from '@/api/client'

export interface StaffAccount {
  id: string
  fullName: string
  email: string
  role: 'CASHIER' | 'RIDER'
  status: string
}

export interface UpdateStaffAccount {
  fullName: string
  email: string
  password?: string
}

export const staffService = {
  async list(): Promise<StaffAccount[]> {
    const response = await apiClient.get<{ success: boolean; data: StaffAccount[] }>('/auth/staff-accounts')
    return response.data.data
  },

  async update(userId: string, data: UpdateStaffAccount): Promise<void> {
    await apiClient.put(`/auth/staff-accounts/${userId}`, data)
  },
}
