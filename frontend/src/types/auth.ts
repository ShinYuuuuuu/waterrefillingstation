export type UserRole = 'OWNER' | 'BRANCH_MANAGER' | 'CASHIER' | 'INVENTORY_STAFF' | 'RIDER' | 'DISPATCHER' | 'ACCOUNTANT' | 'RESELLER' | 'CUSTOMER' | 'TECHNICIAN' | 'SUPER_ADMIN'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  branch_id: string | null
  tenant_id: string
  status: string
  last_login_at: string | null
  created_at: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}
