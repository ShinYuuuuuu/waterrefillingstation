import { apiClient } from '@/api/client'

export interface MaintenanceSchedule {
  id: string
  name: string
  triggerType: 'GALLONS' | 'DAYS'
  gallonInterval: number | null
  dayInterval: number | null
  gallonsSinceMaintenance: number
  gallonsRemaining: number | null
  lastCompletedAt: string | null
  nextDueAt: string | null
  notes: string | null
  due: boolean
}

export interface MaintenanceHistoryItem {
  id: string
  scheduleId: string
  maintenanceName: string
  performedBy: string
  performedAt: string
  gallonCountAtCompletion: number
  notes: string | null
}

export const maintenanceService = {
  async list(): Promise<{ totalGallonsSold: number; schedules: MaintenanceSchedule[] }> {
    const response = await apiClient.get('/maintenance')
    return response.data.data
  },
  async create(data: { name: string; triggerType: 'GALLONS' | 'DAYS'; gallonInterval?: number; dayInterval?: number; nextDueAt?: string; notes?: string }): Promise<MaintenanceSchedule> {
    const response = await apiClient.post('/maintenance', data)
    return response.data.data
  },
  async history(): Promise<MaintenanceHistoryItem[]> {
    const response = await apiClient.get('/maintenance/history')
    return response.data.data
  },
  async complete(id: string): Promise<void> { await apiClient.post(`/maintenance/${id}/complete`, {}) },
  async remove(id: string): Promise<void> { await apiClient.delete(`/maintenance/${id}`) },
}
