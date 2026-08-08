import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import type { LoginCredentials, AuthResponse, User } from '@/types/auth'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
}

interface MeResponse {
  id: string
  tenantId: string
  branchId: string | null
  fullName: string
  email: string
  role: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<{ success: boolean; data: LoginResponse }>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    )
    console.log('[AUTH DEBUG] LOGIN_RESPONSE', { status: response.status, data: response.data })

    const { accessToken, refreshToken } = response.data.data
    console.log('[AUTH DEBUG] TOKENS_EXTRACTED', {
      accessTokenPresent: !!accessToken,
      refreshTokenPresent: !!refreshToken,
      accessTokenLength: accessToken?.length,
      refreshTokenLength: refreshToken?.length,
    })

    // Fetch the current user after login, passing the token directly
    const meResponse = await apiClient.get<{ success: boolean; data: MeResponse }>(
      '/auth/me',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    console.log('[AUTH DEBUG] ME_RESPONSE', { status: meResponse.status, data: meResponse.data })
    const meData = meResponse.data.data
    console.log('[AUTH DEBUG] USER_EXTRACTION', { meData })
    console.log('[AUTH DEBUG] ROLE_FROM_API', { rawRole: meData.role })
    const normalizedRole = typeof meData.role === 'string' ? meData.role.toLowerCase() : 'customer'
    console.log('[AUTH DEBUG] ROLE_NORMALIZED', { normalizedRole })

    const user: User = {
      id: meData.id,
      email: meData.email,
      full_name: meData.fullName,
      role: normalizedRole as any,
      branch_id: meData.branchId,
      tenant_id: meData.tenantId,
      status: 'active',
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    }
  },

  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
  },

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const response = await apiClient.post<{ success: boolean; data: { accessToken: string } }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    )
    return { access_token: response.data.data.accessToken }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },
}
