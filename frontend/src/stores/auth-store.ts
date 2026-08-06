import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, AuthState, LoginCredentials } from '@/types/auth'
import { apiClient } from '@/api/client'
import { API_ENDPOINTS } from '@/api/endpoints'
import { queryClient } from '@/lib/query-client'
import { authService } from '@/services/auth.service'

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (credentials: LoginCredentials) => {
        console.log('[AUTH DEBUG] LOGIN_REQUEST', { credentials: credentials.email })
        set({ isLoading: true })
        try {
          const response = await authService.login(credentials)
          console.log('[AUTH DEBUG] LOGIN_SUCCESS', { response })
          const { access_token, refresh_token, user } = response

          console.log('[AUTH DEBUG] TOKENS_SAVED', {
            access_token_present: !!access_token,
            refresh_token_present: !!refresh_token,
            access_token_key: localStorage.getItem('access_token'),
            refresh_token_key: localStorage.getItem('refresh_token'),
          })

          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)

          console.log('[AUTH DEBUG] USER_SET', { user, isAuthenticated: true })

          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })

          queryClient.invalidateQueries()
        } catch (error: any) {
          console.log('[AUTH DEBUG] LOGIN_ERROR', { message: error?.message, status: error?.response?.status })
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
        } catch {
          // Continue with logout even if API call fails
        }

        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        queryClient.clear()

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user })
      },

      setTokens: (accessToken: string, newRefreshToken: string) => {
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', newRefreshToken)
        set({ accessToken, refreshToken: newRefreshToken, isAuthenticated: true })
      },

      initialize: async () => {
        console.log('[AUTH DEBUG] INITIALIZE_START', {
          hasToken: !!localStorage.getItem('access_token'),
        })
        const token = localStorage.getItem('access_token')
        if (!token) {
          console.log('[AUTH DEBUG] INITIALIZE_NO_TOKEN')
          set({ isLoading: false, isAuthenticated: false })
          return
        }

        try {
          const response = await apiClient.get<{ success: boolean; data: { id: string; tenantId: string; branchId: string | null; fullName: string; email: string; role: string } }>(
            '/auth/me'
          )
          const meData = response.data.data

          console.log('[AUTH DEBUG] INITIALIZE_ME_RESPONSE', { status: response.status, data: meData })

          const user: User = {
            id: meData.id,
            email: meData.email,
            full_name: meData.fullName,
            role: meData.role as any,
            branch_id: meData.branchId,
            tenant_id: meData.tenantId,
            status: 'active',
            last_login_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }

          console.log('[AUTH DEBUG] INITIALIZE_USER_SET', { user })

          set({
            user,
            accessToken: token,
            refreshToken: localStorage.getItem('refresh_token'),
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          console.log('[AUTH DEBUG] INITIALIZE_ME_FAILED')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
